import React, { useState, useEffect, useRef } from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity, StatusBar, ScrollView, Dimensions, Linking, Modal, Animated, Easing, BackHandler, Alert } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Slider from '@react-native-community/slider';
import { WebView } from 'react-native-webview';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import { NavigationContainer } from '@react-navigation/native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';

const STREAM_URL = 'https://server3.livecastradio.com:9004/stream';
const WP_API_BANNERS = 'https://delriofm.com.ar/wp-json/wp/v2/banner-publicidad?_embed';
const FACEBOOK_URL = 'https://www.facebook.com/delriofm993sanfranciscodelmontedeoro';
const WEB_URL = 'https://delriofm.com.ar';
const RSA_WEB_URL = 'https://www.rsamultimedia.com';
const SUPPORT_EMAIL = 'rsamultimedia@gmail.com';

const { width } = Dimensions.get('window');

const SLIDER_WIDTH = width - 32;
const SLIDER_HEIGHT = SLIDER_WIDTH * (3 / 4);
const AD_HEIGHT = 150;

const SINGLE_PHRASE = "Somos la radio de San Francisco del Monte de Oro  ·  Nos escuchas en el aire de la 99.3 mhz en San Francisco del Monte de Oro  ·  Envianos tu mensaje vía Whatsapp  ·    ";
const MARQUEE_TEXT = SINGLE_PHRASE + SINGLE_PHRASE;

const ORIGINAL_SLIDER_IMAGES = [
  require('./assets/IMAGEN_HERO_APP_1.png'),
  require('./assets/IMAGEN_HERO_APP_2.png'),
  require('./assets/IMAGEN_HERO_APP_3.png'),
];

// --- PANTALLA SPLASH ---
function SplashScreen({ onFinish }) {
  const dot1 = useRef(new Animated.Value(0.3)).current;
  const dot2 = useRef(new Animated.Value(0.3)).current;
  const dot3 = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animateDot = (dot, delay) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(dot, { toValue: 1, duration: 400, delay, useNativeDriver: true }),
          Animated.timing(dot, { toValue: 0.3, duration: 400, useNativeDriver: true }),
        ])
      );
    };

    const anim1 = animateDot(dot1, 0);
    const anim2 = animateDot(dot2, 200);
    const anim3 = animateDot(dot3, 400);

    anim1.start();
    anim2.start();
    anim3.start();

    const timer = setTimeout(() => {
      onFinish();
    }, 2500);

    return () => {
      clearTimeout(timer);
      anim1.stop();
      anim2.stop();
      anim3.stop();
    };
  }, []);

  return (
    <View style={styles.splashContainer}>
      <StatusBar barStyle="light-content" backgroundColor="#252d39" />
      
      <View style={styles.splashContent}>
        <Image 
          source={require('./assets/logo.png')} 
          style={styles.splashLogo} 
          resizeMode="contain" 
        />
        
        <View style={styles.dotsContainer}>
          <Animated.View style={[styles.splashDot, { opacity: dot1, backgroundColor: '#d1d5db' }]} />
          <Animated.View style={[styles.splashDot, { opacity: dot2, backgroundColor: '#9ca3af' }]} />
          <Animated.View style={[styles.splashDot, { opacity: dot3, backgroundColor: '#4b5563' }]} />
        </View>
      </View>

      <View style={styles.splashFooter}>
        <Text style={styles.splashTitle}>Del Rio FM 99.3 mhz</Text>
        <Text style={styles.splashSubtitle}>San Francisco del Monte de Oro</Text>
      </View>
    </View>
  );
}

// --- PANTALLA PRINCIPAL (INICIO) ---
function HomeScreen({ theme, autoPlay }) {
  const isDark = theme === 'dark';
  const [isPlaying, setIsPlaying] = useState(autoPlay);
  const [volume, setVolume] = useState(1.0);
  const [activeIndex, setActiveIndex] = useState(0);
  const [randomizedImages, setRandomizedImages] = useState([]);
  
  const [adsImages, setAdsImages] = useState([]);
  const [currentAdIndex, setCurrentAdIndex] = useState(0);
  const [loadingAd, setLoadingAd] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const skeletonAnim = useRef(new Animated.Value(0.3)).current;

  const marqueeAnim = useRef(new Animated.Value(width)).current;

  const [showVolumeModal, setShowVolumeModal] = useState(false);
  const [sleepTimerMinutes, setSleepTimerMinutes] = useState(null);
  const [showTimerModal, setShowTimerModal] = useState(false);

  const scrollViewRef = useRef(null);

  useEffect(() => {
    setIsPlaying(autoPlay);
  }, [autoPlay]);

  useEffect(() => {
    const shuffled = [...ORIGINAL_SLIDER_IMAGES].sort(() => Math.random() - 0.5);
    setRandomizedImages(shuffled);
  }, []);

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(skeletonAnim, { toValue: 1, duration: 800, useNativeDriver: true }),
        Animated.timing(skeletonAnim, { toValue: 0.3, duration: 800, useNativeDriver: true }),
      ])
    ).start();
  }, []);

  useEffect(() => {
    fetch(WP_API_BANNERS)
      .then((response) => response.json())
      .then((data) => {
        if (Array.isArray(data) && data.length > 0) {
          const fetchedAds = data.map((post) => {
            try {
              const imageUrl = post.meta?.imagen_publicidad || post.imagen_publicidad;
              return imageUrl ? { uri: imageUrl } : null;
            } catch (e) {
              return null;
            }
          }).filter(Boolean);

          if (fetchedAds.length > 0) {
            const shuffledAds = [...fetchedAds].sort(() => Math.random() - 0.5);
            setAdsImages(shuffledAds);
          }
        }
        setLoadingAd(false);
      })
      .catch((error) => {
        console.log('Error al conectar con la API de WordPress:', error);
        setLoadingAd(false);
      });
  }, []);

  useEffect(() => {
    if (randomizedImages.length === 0) return;

    const interval = setInterval(() => {
      setActiveIndex((prevIndex) => {
        const nextIndex = (prevIndex + 1) % randomizedImages.length;
        if (scrollViewRef.current) {
          scrollViewRef.current.scrollTo({
            x: nextIndex * SLIDER_WIDTH,
            animated: true,
          });
        }
        return nextIndex;
      });
    }, 5000);

    return () => clearInterval(interval);
  }, [randomizedImages]);

  useEffect(() => {
    if (adsImages.length <= 1) return;

    const adInterval = setInterval(() => {
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }).start(() => {
        setCurrentAdIndex((prevIndex) => (prevIndex + 1) % adsImages.length);
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 500,
          useNativeDriver: true,
        }).start();
      });
    }, 4500);

    return () => clearInterval(adInterval);
  }, [adsImages]);

  useEffect(() => {
    const startMarquee = () => {
      marqueeAnim.setValue(width);
      Animated.timing(marqueeAnim, {
        toValue: -950,
        duration: 18000,
        easing: Easing.linear,
        useNativeDriver: true,
      }).start(({ finished }) => {
        if (finished) {
          startMarquee();
        }
      });
    };
    startMarquee();
  }, []);

  useEffect(() => {
    let timer;
    if (sleepTimerMinutes && sleepTimerMinutes > 0 && isPlaying) {
      timer = setTimeout(() => {
        setIsPlaying(false);
        setSleepTimerMinutes(null);
      }, sleepTimerMinutes * 60 * 1000);
    }
    return () => clearTimeout(timer);
  }, [sleepTimerMinutes, isPlaying]);

  const handleCloseAppConfirm = () => {
    Alert.alert(
      "Cerrar aplicación",
      "¿Estás seguro de que deseas salir de Del Río FM?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          onPress: () => {
            setIsPlaying(false);
            setTimeout(() => {
              BackHandler.exitApp();
            }, 200);
          }, 
          style: "destructive" 
        }
      ],
      { cancelable: true }
    );
  };

  const handleScroll = (event) => {
    const scrollPosition = event.nativeEvent.contentOffset.x;
    const index = Math.round(scrollPosition / SLIDER_WIDTH);
    setActiveIndex(index);
  };

  const htmlContent = isPlaying ? `
    <html>
      <body style="background-color:#252d39; margin:0; display:flex; justify-content:center; align-items:center; height:100vh;">
        <audio id="stream" src="${STREAM_URL}" autoplay preload="auto"></audio>
        <script>
          const audio = document.getElementById('stream');
          audio.volume = ${volume};
          audio.play().catch(e => console.log(e));
        </script>
      </body>
    </html>
  ` : `<html></html>`;

  return (
    <View style={[styles.screenContainerWhite, isDark && styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#252d39" />
      
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#252d39' }}>
        <View style={styles.topBarRef}>
          <View style={styles.topBarLeftContent}>
            <Image source={require('./assets/logo.png')} style={styles.logoCircleRef} resizeMode="cover" />
            <View style={styles.topBarTextContainerRef}>
              <Text style={styles.topBarTitleRef}>Del Río FM 99.3 mhz</Text>
              <Text style={styles.topBarSubtitleRef}>San Francisco del Monte de Oro</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeIconRef} onPress={handleCloseAppConfirm}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent} showsVerticalScrollIndicator={false}>
        
        <View style={[styles.heroCard, { height: SLIDER_HEIGHT }]}>
          <ScrollView
            ref={scrollViewRef}
            horizontal
            pagingEnabled
            showsHorizontalScrollIndicator={false}
            onScroll={handleScroll}
            scrollEventThrottle={16}
          >
            {randomizedImages.map((img, index) => (
              <View key={index} style={[styles.sliderItem, { width: SLIDER_WIDTH, height: SLIDER_HEIGHT }]}>
                <Image source={img} style={styles.localCardImage} resizeMode="cover" />
              </View>
            ))}
          </ScrollView>

          <View style={styles.sliderDotsContainer}>
            {randomizedImages.map((_, index) => (
              <View 
                key={index} 
                style={[
                  styles.sliderDot, 
                  { backgroundColor: activeIndex === index ? '#38bdf8' : 'rgba(255,255,255,0.4)' }
                ]} 
              />
            ))}
          </View>
        </View>

        <View style={styles.playerWrapperExact}>
          
          {isPlaying ? (
            <View style={styles.badgeEnElAire}>
              <Text style={styles.badgeEnElAireText}>EN EL AIRE</Text>
            </View>
          ) : (
            <View style={styles.badgePausado}>
              <Text style={styles.badgePausadoText}>PAUSADO</Text>
            </View>
          )}

          <View style={styles.audioWrapper}>
            <WebView
              originWhitelist={['*']}
              source={{ html: htmlContent }}
              allowsInlineMediaPlayback={true}
              mediaPlaybackRequiresUserAction={false}
              javaScriptEnabled={true}
            />
          </View>

          <View style={[styles.pillBarContainer, isDark && styles.darkPillBar]}>
            
            <TouchableOpacity style={styles.pillIconBtn} onPress={() => setShowTimerModal(true)}>
              <Ionicons name="time-outline" size={28} color={isDark ? "#cbd5e1" : "#94a3b8"} />
              {sleepTimerMinutes && <View style={styles.timerActiveDotExact} />}
            </TouchableOpacity>

            <View style={{ width: 80 }} />

            <TouchableOpacity style={styles.pillIconBtn} onPress={() => setShowVolumeModal(true)}>
              <Ionicons name="volume-high" size={28} color={isDark ? "#cbd5e1" : "#94a3b8"} />
            </TouchableOpacity>

          </View>

          <TouchableOpacity 
            style={styles.floatingPlayBtnExact}
            onPress={() => setIsPlaying(!isPlaying)}
            activeOpacity={0.9}
          >
            <Ionicons 
              name={isPlaying ? "square" : "play"} 
              size={34} 
              color="#ffffff" 
              style={{ marginLeft: isPlaying ? 0 : 4 }} 
            />
          </TouchableOpacity>

        </View>

        <Text style={[styles.sectionPublicidadLabelCentered, isDark && styles.darkTextMuted]}>PUBLICIDAD</Text>
        <View style={[styles.adBannerCardHeight150, { height: AD_HEIGHT }]}>
          {loadingAd ? (
            <Animated.View style={[styles.skeletonBox, isDark && styles.darkSkeleton, { opacity: skeletonAnim }]} />
          ) : adsImages.length > 0 ? (
            <Animated.View style={[{ width: '100%', height: AD_HEIGHT, opacity: fadeAnim }]}>
              <Image source={adsImages[currentAdIndex]} style={styles.localCardImage} resizeMode="cover" />
            </Animated.View>
          ) : (
            <Image source={require('./assets/logo.png')} style={styles.localCardImage} resizeMode="cover" />
          )}
        </View>

        <View style={styles.marqueeContainerTransparent}>
          <Animated.View style={[styles.marqueeInner, { transform: [{ translateX: marqueeAnim }] }]}>
            <Text style={[styles.marqueeTextDark, isDark && styles.darkMarqueeText]} numberOfLines={1}>
              {MARQUEE_TEXT}
            </Text>
          </Animated.View>
        </View>

      </ScrollView>

      <Modal visible={showVolumeModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
            <Text style={styles.modalTitle}>Ajustar Volumen</Text>
            <View style={styles.modalVolumeRow}>
              <Ionicons name="volume-low" size={22} color="#94a3b8" />
              <Slider
                style={styles.modalSlider}
                minimumValue={0}
                maximumValue={1}
                value={volume}
                onValueChange={(val) => setVolume(val)}
                minimumTrackTintColor="#38bdf8"
                maximumTrackTintColor="#475569"
                thumbTintColor="#38bdf8"
              />
              <Ionicons name="volume-high" size={22} color="#94a3b8" />
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowVolumeModal(false)}>
              <Text style={styles.modalCloseText}>Aceptar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      <Modal visible={showTimerModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
            <Text style={styles.modalTitle}>Apagado Automático (Timer)</Text>
            <View style={styles.timerOptionsGrid}>
              {[15, 30, 45, 60].map((mins) => (
                <TouchableOpacity 
                  key={mins} 
                  style={[styles.timerOptionBtn, isDark && styles.darkTimerOptionBtn, sleepTimerMinutes === mins && styles.timerOptionActive]}
                  onPress={() => { setSleepTimerMinutes(mins); setShowTimerModal(false); }}
                >
                  <Text style={styles.timerOptionText}>{mins} min</Text>
                </TouchableOpacity>
              ))}
            </View>
            {sleepTimerMinutes && (
              <TouchableOpacity style={styles.timerCancelBtn} onPress={() => { setSleepTimerMinutes(null); setShowTimerModal(false); }}>
                <Text style={styles.timerCancelText}>Desactivar Temporizador</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowTimerModal(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

// --- PANTALLA NOSOTROS ---
function AboutScreen({ theme }) {
  const isDark = theme === 'dark';

  const handleCloseAppConfirm = () => {
    Alert.alert(
      "Cerrar aplicación",
      "¿Estás seguro de que deseas salir de Del Río FM?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          onPress: () => {
            BackHandler.exitApp();
          }, 
          style: "destructive" 
        }
      ],
      { cancelable: true }
    );
  };

  return (
    <View style={[styles.screenContainerWhite, isDark && styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#252d39" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#252d39' }}>
        <View style={styles.topBarRef}>
          <View style={styles.topBarLeftContent}>
            <Image source={require('./assets/logo.png')} style={styles.logoCircleRef} resizeMode="cover" />
            <View style={styles.topBarTextContainerRef}>
              <Text style={styles.topBarTitleRef}>Del Río FM 99.3 mhz</Text>
              <Text style={styles.topBarSubtitleRef}>San Francisco del Monte de Oro</Text>
            </View>
          </View>
          <TouchableOpacity onPress={handleCloseAppConfirm} style={styles.closeIconRef}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.aboutCardContainer, isDark && styles.darkCard]}>
          <View style={styles.aboutLogoContainer}>
            <Image source={require('./assets/logo.png')} style={styles.aboutLogoImage} resizeMode="contain" />
          </View>

          <Text style={[styles.aboutMainTitle, isDark && styles.darkTextWhite]}>SOMOS LA RADIO</Text>
          <Text style={[styles.aboutSubTitle, isDark && styles.darkTextMuted]}>de San Francisco del Monte de Oro</Text>

          <Text style={[styles.aboutParagraph, isDark && styles.darkTextParagraph]}>
            A 110 km al norte de San Luis, enclavado en las serranías y bañado por rios y saltos que conforman un maravilloso valle, San Francisco del Monte de Oro te invita a descubrirlo, visitarlo y vivirlo. A traves de nuestra radio conectamos a todos los parajes y localidades vecinas de San Francisco del Monte de Oro, con buena música y la mejor programación en vivo.
          </Text>

          <Text style={[styles.aboutHighlightText, isDark && styles.darkHighlight]}>
            En San Francisco del Monte de Oro nos escuchas en la 99.3 mhz
          </Text>
        </View>

        <View style={styles.actionButtonsRowAbout}>
          <TouchableOpacity style={[styles.actionBtnLight, isDark && styles.darkActionBtn]} onPress={() => Linking.openURL(FACEBOOK_URL)}>
            <Text style={[styles.actionBtnTextLight, isDark && styles.darkTextWhite]}>Seguinos en Facebook</Text>
            <FontAwesome name="facebook-square" size={20} color="#1877F2" />
          </TouchableOpacity>

          <TouchableOpacity style={[styles.actionBtnLight, isDark && styles.darkActionBtn]} onPress={() => Linking.openURL(WEB_URL)}>
            <Ionicons name="globe-outline" size={20} color="#0284c7" />
            <Text style={[styles.actionBtnTextLight, isDark && styles.darkTextWhite]}>Visitá nuestra web</Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
}

// --- PANTALLA AJUSTES ---
function SettingsScreen({ theme, setTheme, streamQuality, setStreamQuality, autoPlay, setAutoPlay }) {
  const isDark = theme === 'dark';
  const [showPrivacyModal, setShowPrivacyModal] = useState(false);
  const [showQualityModal, setShowQualityModal] = useState(false);

  const handleCloseAppConfirm = () => {
    Alert.alert(
      "Cerrar aplicación",
      "¿Estás seguro de que deseas salir de Del Río FM?",
      [
        { text: "Cancelar", style: "cancel" },
        { 
          text: "Salir", 
          onPress: () => {
            BackHandler.exitApp();
          }, 
          style: "destructive" 
        }
      ],
      { cancelable: true }
    );
  };

  const sendSupportEmail = () => {
    Linking.openURL(`mailto:${SUPPORT_EMAIL}?subject=Sugerencia%20/%20Reporte%20de%20Error%20-%20Del%20Río%20FM`);
  };

  return (
    <View style={[styles.screenContainerWhite, isDark && styles.darkContainer]}>
      <StatusBar barStyle="light-content" backgroundColor="#252d39" />
      <SafeAreaView edges={['top']} style={{ backgroundColor: '#252d39' }}>
        <View style={styles.topBarRef}>
          <View style={styles.topBarLeftContent}>
            <Image source={require('./assets/logo.png')} style={styles.logoCircleRef} resizeMode="cover" />
            <View style={styles.topBarTextContainerRef}>
              <Text style={styles.topBarTitleRef}>Del Río FM 99.3 mhz</Text>
              <Text style={styles.topBarSubtitleRef}>San Francisco del Monte de Oro</Text>
            </View>
          </View>
          <TouchableOpacity style={styles.closeIconRef} onPress={handleCloseAppConfirm}>
            <Ionicons name="close" size={22} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={[styles.settingsBoxLight, isDark && styles.darkCard]}>
          
          <View style={styles.settingsGroupList}>
            {/* Modo Oscuro */}
            <View style={styles.settingRowInline}>
              <Text style={[styles.settingLabelDark, isDark && styles.darkTextWhite]}>Modo oscuro</Text>
              <TouchableOpacity 
                style={[styles.switchTrack, { backgroundColor: isDark ? '#0284c7' : '#cbd5e1' }]}
                onPress={() => setTheme(isDark ? 'light' : 'dark')}
              >
                <View style={[styles.switchThumb, { alignSelf: isDark ? 'flex-end' : 'flex-start' }]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.settingDivider, isDark && styles.darkDivider]} />

            {/* Auto-play al abrir */}
            <View style={styles.settingRowInline}>
              <View style={{ flex: 1, marginRight: 10 }}>
                <Text style={[styles.settingLabelDark, isDark && styles.darkTextWhite]}>Reproducción automática</Text>
                <Text style={[styles.settingSubLabel, isDark && styles.darkTextMuted]}>Reproducir al abrir la app</Text>
              </View>
              <TouchableOpacity 
                style={[styles.switchTrack, { backgroundColor: autoPlay ? '#0284c7' : '#cbd5e1' }]}
                onPress={() => setAutoPlay(!autoPlay)}
              >
                <View style={[styles.switchThumb, { alignSelf: autoPlay ? 'flex-end' : 'flex-start' }]} />
              </TouchableOpacity>
            </View>

            <View style={[styles.settingDivider, isDark && styles.darkDivider]} />

            {/* Calidad de Streaming */}
            <TouchableOpacity style={styles.settingRowInline} onPress={() => setShowQualityModal(true)}>
              <View>
                <Text style={[styles.settingLabelDark, isDark && styles.darkTextWhite]}>Calidad de streaming</Text>
                <Text style={[styles.settingSubLabel, isDark && styles.darkTextMuted]}>Actual: {streamQuality}</Text>
              </View>
              <Ionicons name="chevron-forward" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>

            <View style={[styles.settingDivider, isDark && styles.darkDivider]} />

            {/* Enviar Sugerencias / Soporte */}
            <TouchableOpacity style={styles.settingRowInline} onPress={sendSupportEmail}>
              <View>
                <Text style={[styles.settingLabelDark, isDark && styles.darkTextWhite]}>Sugerencias o Reportar Error</Text>
                <Text style={[styles.settingSubLabel, isDark && styles.darkTextMuted]}>Contactar a {SUPPORT_EMAIL}</Text>
              </View>
              <Ionicons name="mail-outline" size={20} color="#0284c7" />
            </TouchableOpacity>

            <View style={[styles.settingDivider, isDark && styles.darkDivider]} />

            {/* Política de Privacidad */}
            <TouchableOpacity style={styles.settingRowInline} onPress={() => setShowPrivacyModal(true)}>
              <Text style={[styles.settingLabelDark, isDark && styles.darkTextWhite]}>Política de Privacidad</Text>
              <Ionicons name="document-text-outline" size={20} color={isDark ? "#94a3b8" : "#64748b"} />
            </TouchableOpacity>
          </View>

          <View style={styles.settingsContentCenter}>
            <Text style={[styles.versionTextSmall, isDark && styles.darkTextMuted]}>Versión app 2.0.0</Text>

            <View style={[styles.settingDivider, isDark && styles.darkDivider, { width: '100%', marginBottom: 15 }]} />

            <View style={styles.footerBrandingContainer}>
              <TouchableOpacity onPress={() => Linking.openURL(RSA_WEB_URL)} style={styles.rsaLogoTouchable} activeOpacity={0.8}>
                <Image 
                  source={isDark ? require('./assets/rsamultimedia_logo_wh.png') : require('./assets/rsamultimedia_logo_bk.png')} 
                  style={styles.rsaLogoImageStyle} 
                  resizeMode="contain" 
                />
              </TouchableOpacity>
              <Text style={[styles.locationText, isDark && styles.darkTextMuted]}>De San Luis | Argentina para el mundo</Text>
            </View>
          </View>

        </View>
      </ScrollView>

      {/* Modal para Calidad de Streaming */}
      <Modal visible={showQualityModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, isDark && styles.darkModalContent]}>
            <Text style={styles.modalTitle}>Calidad de Streaming</Text>
            <View style={styles.qualityOptionsList}>
              {['Alta (HQ)', 'Media (Estándar)', 'Baja (Ahorro de datos)'].map((quality) => (
                <TouchableOpacity 
                  key={quality} 
                  style={[styles.qualityOptionBtn, isDark && styles.darkTimerOptionBtn, streamQuality === quality && styles.timerOptionActive]}
                  onPress={() => { setStreamQuality(quality); setShowQualityModal(false); }}
                >
                  <Text style={styles.timerOptionText}>{quality}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowQualityModal(false)}>
              <Text style={styles.modalCloseText}>Cerrar</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Modal de Política de Privacidad */}
      <Modal visible={showPrivacyModal} transparent={true} animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { width: '85%', maxHeight: '80%' }, isDark && styles.darkModalContent]}>
            <Text style={styles.modalTitle}>Política de Privacidad</Text>
            <ScrollView showsVerticalScrollIndicator={false} style={{ width: '100%', marginBottom: 20 }}>
              <Text style={[styles.privacyBodyText, isDark && styles.darkTextParagraph]}>
                En Del Río FM respetamos su privacidad y nos comprometemos a proteger sus datos personales. Esta aplicación cumple con las normativas estándar de Google Play y App Store.{'\n\n'}
                • **Recopilación de datos:** La app no guarda información personal de los usuarios ni comparte datos con terceros.{'\n\n'}
                • **Permisos de Red:** Se utiliza acceso a internet únicamente para la transmisión en vivo del streaming de radio y carga de banners publicitarios institucionales.{'\n\n'}
                • **Cookies y Analítica:** No realizamos seguimiento de comportamiento publicitario de terceros dentro de la plataforma principal.
              </Text>
            </ScrollView>
            <TouchableOpacity style={styles.modalCloseBtn} onPress={() => setShowPrivacyModal(false)}>
              <Text style={styles.modalCloseText}>Entendido</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

    </View>
  );
}

const Tab = createBottomTabNavigator();

function MainTabs({ theme, setTheme, streamQuality, setStreamQuality, autoPlay, setAutoPlay }) {
  const isDark = theme === 'dark';

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: { 
          backgroundColor: isDark ? '#1e293b' : '#ffffff', 
          height: 62, 
          paddingBottom: 6, 
          borderTopWidth: 1, 
          borderTopColor: isDark ? '#334155' : '#e2e8f0' 
        },
        tabBarActiveTintColor: '#0284c7',
        tabBarInactiveTintColor: isDark ? '#94a3b8' : '#64748b',
        tabBarLabelStyle: { fontSize: 12, fontWeight: '600' },
        tabBarIcon: ({ color, size }) => {
          let iconName;
          if (route.name === 'Inicio') iconName = 'home';
          else if (route.name === 'Nosotros') iconName = 'radio';
          else if (route.name === 'Ajustes') iconName = 'settings';
          
          return (
            <View style={{ alignItems: 'center', justifyContent: 'center' }}>
              <Ionicons name={iconName} size={size} color={color} />
            </View>
          );
        },
      })}
    >
      <Tab.Screen name="Inicio">
        {() => <HomeScreen theme={theme} autoPlay={autoPlay} />}
      </Tab.Screen>
      <Tab.Screen name="Nosotros">
        {() => <AboutScreen theme={theme} />}
      </Tab.Screen>
      <Tab.Screen name="Ajustes">
        {() => (
          <SettingsScreen 
            theme={theme} 
            setTheme={setTheme} 
            streamQuality={streamQuality} 
            setStreamQuality={setStreamQuality}
            autoPlay={autoPlay}
            setAutoPlay={setAutoPlay}
          />
        )}
      </Tab.Screen>
    </Tab.Navigator>
  );
}

export default function App() {
  const [isLoading, setIsLoading] = useState(true);
  const [theme, setTheme] = useState('light');
  const [streamQuality, setStreamQuality] = useState('Alta (HQ)');
  const [autoPlay, setAutoPlay] = useState(false);

  // Cargar preferencias guardadas al iniciar
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const savedTheme = await AsyncStorage.getItem('@app_theme');
        const savedQuality = await AsyncStorage.getItem('@app_quality');
        const savedAutoPlay = await AsyncStorage.getItem('@app_autoplay');

        if (savedTheme !== null) setTheme(savedTheme);
        if (savedQuality !== null) setStreamQuality(savedQuality);
        if (savedAutoPlay !== null) setAutoPlay(JSON.parse(savedAutoPlay));
      } catch (e) {
        console.log('Error al cargar ajustes', e);
      }
    };
    loadSettings();
  }, []);

  // Guardar modo oscuro / claro
  const handleSetTheme = async (newTheme) => {
    setTheme(newTheme);
    try {
      await AsyncStorage.setItem('@app_theme', newTheme);
    } catch (e) {
      console.log('Error al guardar theme', e);
    }
  };

  // Guardar calidad de streaming
  const handleSetStreamQuality = async (newQuality) => {
    setStreamQuality(newQuality);
    try {
      await AsyncStorage.setItem('@app_quality', newQuality);
    } catch (e) {
      console.log('Error al guardar quality', e);
    }
  };

  // Guardar auto-play
  const handleSetAutoPlay = async (newAutoPlay) => {
    setAutoPlay(newAutoPlay);
    try {
      await AsyncStorage.setItem('@app_autoplay', JSON.stringify(newAutoPlay));
    } catch (e) {
      console.log('Error al guardar autoplay', e);
    }
  };

  if (isLoading) {
    return <SplashScreen onFinish={() => setIsLoading(false)} />;
  }

  return (
    <NavigationContainer>
      <MainTabs 
        theme={theme} 
        setTheme={handleSetTheme} 
        streamQuality={streamQuality} 
        setStreamQuality={handleSetStreamQuality}
        autoPlay={autoPlay}
        setAutoPlay={handleSetAutoPlay}
      />
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  splashContainer: { flex: 1, backgroundColor: '#ffffff', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 50 },
  splashContent: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  splashLogo: { width: 200, height: 200, marginBottom: 35 },
  dotsContainer: { flexDirection: 'row', gap: 10 },
  splashDot: { width: 10, height: 10, borderRadius: 5 },
  splashFooter: { alignItems: 'center', marginBottom: 20 },
  splashTitle: { color: '#000000', fontSize: 17, fontWeight: 'bold', letterSpacing: 0.5 },
  splashSubtitle: { color: '#4b5563', fontSize: 12, marginTop: 2 },

  screenContainerWhite: { flex: 1, backgroundColor: '#ffffff' },
  darkContainer: { backgroundColor: '#0f172a' },

  darkCard: { backgroundColor: '#1e293b', borderColor: '#334155' },
  darkTextWhite: { color: '#ffffff' },
  darkTextMuted: { color: '#94a3b8' },
  darkTextParagraph: { color: '#cbd5e1' },
  darkHighlight: { backgroundColor: '#0f172a', color: '#ffffff' },
  darkActionBtn: { backgroundColor: '#1e293b', borderColor: '#334155', borderWidth: 1 },
  darkPillBar: { backgroundColor: '#1e293b' },
  darkSkeleton: { backgroundColor: '#334155' },
  darkMarqueeText: { color: '#f8fafc' },
  darkModalContent: { backgroundColor: '#1e293b' },
  darkTimerOptionBtn: { backgroundColor: '#0f172a' },
  darkDivider: { backgroundColor: '#334155' },

  topBarRef: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252d39', paddingVertical: 12, paddingHorizontal: 16 },
  topBarLeftContent: { flexDirection: 'row', alignItems: 'center' },
  logoCircleRef: { width: 48, height: 48, borderRadius: 24, marginRight: 12, borderWidth: 2, borderColor: '#ffffff' },
  topBarTextContainerRef: { justifyContent: 'center' },
  topBarTitleRef: { color: '#ffffff', fontSize: 16, fontWeight: 'bold' },
  topBarSubtitleRef: { color: '#cbd5e1', fontSize: 11 },
  closeIconRef: { padding: 4 },

  scrollContent: { padding: 16, paddingBottom: 30 },

  heroCard: { backgroundColor: '#1e293b', borderRadius: 20, marginBottom: 14, overflow: 'hidden', width: '100%' },
  sliderItem: { height: '100%' },
  sliderDotsContainer: { flexDirection: 'row', position: 'absolute', bottom: 10, alignSelf: 'center', gap: 6 },
  sliderDot: { width: 6, height: 6, borderRadius: 3 },

  playerWrapperExact: { 
    width: '100%', 
    alignItems: 'center', 
    justifyContent: 'center', 
    marginTop: 32, 
    marginBottom: 20 
  },
  pillBarContainer: { 
    width: '100%', 
    height: 74, 
    backgroundColor: '#d8dee6', 
    borderRadius: 37, 
    flexDirection: 'row', 
    alignItems: 'center', 
    justifyContent: 'space-between', 
    paddingHorizontal: 35,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2
  },
  pillIconBtn: { 
    width: 44, 
    height: 44, 
    alignItems: 'center', 
    justifyContent: 'center' 
  },
  timerActiveDotExact: { 
    width: 8, 
    height: 8, 
    borderRadius: 4, 
    backgroundColor: '#e53e3e', 
    position: 'absolute', 
    top: 6, 
    right: 6 
  },
  floatingPlayBtnExact: { 
    position: 'absolute', 
    width: 86, 
    height: 86, 
    borderRadius: 43, 
    backgroundColor: '#e53e3e', 
    alignItems: 'center', 
    justifyContent: 'center',
    shadowColor: '#e53e3e',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 8,
    elevation: 6,
    borderWidth: 4,
    borderColor: '#ffffff'
  },
  badgeEnElAire: { 
    position: 'absolute', 
    top: -27, 
    alignSelf: 'center', 
    backgroundColor: '#e53e3e', 
    paddingHorizontal: 14, 
    paddingVertical: 3, 
    borderRadius: 12, 
    zIndex: 10 
  },
  badgeEnElAireText: { 
    color: '#ffffff', 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1 
  },
  badgePausado: { 
    position: 'absolute', 
    top: -27, 
    alignSelf: 'center', 
    backgroundColor: '#64748b', 
    paddingHorizontal: 14, 
    paddingVertical: 3, 
    borderRadius: 12, 
    zIndex: 10 
  },
  badgePausadoText: { 
    color: '#ffffff', 
    fontSize: 10, 
    fontWeight: '900', 
    letterSpacing: 1 
  },

  audioWrapper: { height: 0, width: 0, overflow: 'hidden' },

  sectionPublicidadLabelCentered: { color: '#64748b', fontSize: 11, fontWeight: 'bold', letterSpacing: 1.2, marginBottom: 8, marginTop: 4, textAlign: 'center' },
  adBannerCardHeight150: { backgroundColor: '#e2e8f0', borderRadius: 16, marginBottom: 12, overflow: 'hidden', width: '100%' },

  skeletonBox: {
    width: '100%',
    height: '100%',
    backgroundColor: '#cbd5e1',
    borderRadius: 16,
  },

  marqueeContainerTransparent: { 
    width: '100%', 
    height: 36, 
    backgroundColor: 'transparent', 
    overflow: 'hidden', 
    justifyContent: 'center',
    marginBottom: 16 
  },
  marqueeInner: { 
    position: 'absolute', 
    left: 0, 
    width: 3000, 
    flexDirection: 'row', 
    alignItems: 'center' 
  },
  marqueeTextDark: { 
    color: '#1e293b', 
    fontSize: 13, 
    fontWeight: '600'
  },

  localCardImage: { width: '100%', height: '100%' },

  aboutCardContainer: { 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 20, 
    borderWidth: 1, 
    borderColor: '#e2e8f0', 
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    marginBottom: 15
  },
  aboutLogoContainer: {
    width: 100,
    height: 100,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15
  },
  aboutLogoImage: {
    width: '100%',
    height: '100%'
  },
  aboutMainTitle: { 
    color: '#000000', 
    fontSize: 22, 
    fontWeight: '900', 
    textAlign: 'center', 
    letterSpacing: 0.5,
    marginBottom: 2
  },
  aboutSubTitle: { 
    color: '#1f2937', 
    fontSize: 13, 
    fontWeight: '600', 
    textAlign: 'center', 
    marginBottom: 16 
  },
  aboutParagraph: { 
    color: '#374151', 
    fontSize: 12, 
    lineHeight: 20, 
    textAlign: 'center', 
    marginBottom: 16 
  },
  aboutHighlightText: { 
    color: '#000000', 
    fontSize: 12, 
    fontWeight: 'bold', 
    textAlign: 'center', 
    backgroundColor: '#f1f5f9', 
    paddingVertical: 10,
    paddingHorizontal: 15, 
    borderRadius: 8,
    width: '100%'
  },

  actionButtonsRowAbout: { flexDirection: 'row', justifyContent: 'space-between', gap: 10, marginTop: 5 },
  actionBtnLight: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: '#e2e8f0', padding: 12, borderRadius: 14, gap: 8 },
  actionBtnTextLight: { color: '#0f172a', fontSize: 11, fontWeight: '600' },

  topBarRef: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: '#252d39', paddingVertical: 12, paddingHorizontal: 16 },
  
  settingsBoxLight: { 
    backgroundColor: '#ffffff', 
    borderRadius: 16, 
    padding: 20, 
    minHeight: 380, 
    borderWidth: 1, 
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    justifyContent: 'space-between'
  },
  settingsGroupList: {
    width: '100%'
  },
  settingRowInline: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 12 },
  settingLabelDark: { color: '#000000', fontSize: 15, fontWeight: '600' },
  settingSubLabel: { color: '#64748b', fontSize: 11, marginTop: 2 },
  settingDivider: { height: 1, backgroundColor: '#f1f5f9', width: '100%' },
  switchTrack: { width: 50, height: 26, borderRadius: 13, padding: 2, justifyContent: 'center' },
  switchThumb: { width: 22, height: 22, borderRadius: 11, backgroundColor: '#ffffff' },
  
  settingsContentCenter: {
    alignItems: 'center',
    width: '100%',
    marginTop: 20
  },
  versionTextSmall: { color: '#64748b', fontSize: 13, marginBottom: 12, fontWeight: '600' },
  footerBrandingContainer: { alignItems: 'center', width: '100%', marginBottom: 5 },
  rsaLogoTouchable: { width: 160, height: 45, justifyContent: 'center', alignItems: 'center', marginBottom: 4 },
  rsaLogoImageStyle: { width: '100%', height: '100%' },
  locationText: { color: '#64748b', fontSize: 11, fontWeight: '500', letterSpacing: 0.5 },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.7)', justifyContent: 'center', alignItems: 'center' },
  modalContent: { width: '80%', backgroundColor: '#1e293b', borderRadius: 20, padding: 22, alignItems: 'center' },
  modalTitle: { color: '#ffffff', fontSize: 16, fontWeight: 'bold', marginBottom: 20 },
  modalVolumeRow: { flexDirection: 'row', alignItems: 'center', width: '100%', marginBottom: 20 },
  modalSlider: { flex: 1, height: 40, marginHorizontal: 10 },
  timerOptionsGrid: { flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'center', gap: 10, marginBottom: 15 },
  qualityOptionsList: { width: '100%', gap: 10, marginBottom: 15 },
  timerOptionBtn: { backgroundColor: '#0f172a', paddingVertical: 10, paddingHorizontal: 18, borderRadius: 12 },
  qualityOptionBtn: { backgroundColor: '#0f172a', paddingVertical: 12, paddingHorizontal: 18, borderRadius: 12, alignItems: 'center' },
  timerOptionActive: { backgroundColor: '#0284c7' },
  timerOptionText: { color: '#ffffff', fontWeight: '600', fontSize: 14 },
  timerCancelBtn: { marginBottom: 15 },
  timerCancelText: { color: '#ef4444', fontSize: 13, fontWeight: 'bold' },
  modalCloseBtn: { backgroundColor: '#38bdf8', paddingVertical: 10, paddingHorizontal: 30, borderRadius: 12 },
  modalCloseText: { color: '#0f172a', fontWeight: 'bold', fontSize: 14 },
  privacyBodyText: { color: '#cbd5e1', fontSize: 13, lineHeight: 20 }
});