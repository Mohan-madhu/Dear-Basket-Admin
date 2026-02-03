// import React, { useEffect } from "react";
// import { View, Text, StyleSheet, ActivityIndicator, Animated } from "react-native";
// import { useLoading } from "../Contexts/LoadingContext";

// const Loading = () => {
//   const { loading, loadingText } = useLoading();
//   const opacity = new Animated.Value(0); // Animation value for opacity

//   useEffect(() => {
//     if (loading) {
//       // Fade in the loading indicator
//       Animated.timing(opacity, {
//         toValue: 1,
//         duration: 200, // Reduced duration for smoother transition
//         useNativeDriver: true,
//       }).start();
//     } else {
//       // Fade out the loading indicator
//       Animated.timing(opacity, {
//         toValue: 0,
//         duration: 200, // Reduced duration for smoother transition
//         useNativeDriver: true,
//       }).start();
//     }
//   }, [loading]);

//   if (!loading) return null; // Don't render anything when not loading

//   return (
//     <Animated.View style={[styles.container, { opacity }]}>
//       <ActivityIndicator size="large" color="#fff" />
//       {loadingText && <Text style={styles.text}>{loadingText}</Text>}
//     </Animated.View>
//   );
// };

// const styles = StyleSheet.create({
//   container: {
//     flex: 1,
//     justifyContent: "center",
//     alignItems: "center",
//     position: "absolute", // Ensure it sits on top of all other components
//     top: 0,
//     left: 0,
//     right: 0,
//     bottom: 0,
//     backgroundColor: "rgba(0, 0, 0, 0.5)", // Semi-transparent black overlay
//     zIndex: 1000, // High zIndex to place above other components
//   },
//   text: {
//     color: "#fff",
//     fontSize: 16,
//     marginTop: 10, // Space between spinner and text
//   },
// });

// export default Loading;



import React, { useEffect, useRef } from "react";
import { View, Text, StyleSheet, Animated, Dimensions } from "react-native";
import { useLoading } from "../Contexts/LoadingContext";

const { width, height } = Dimensions.get('window');

const Loading = () => {
  const { loading, loadingText } = useLoading();
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;
  const rotation = useRef(new Animated.Value(0)).current;
  const pulseAnim = useRef(new Animated.Value(1)).current;
  const dotAnim1 = useRef(new Animated.Value(0)).current;
  const dotAnim2 = useRef(new Animated.Value(0)).current;
  const dotAnim3 = useRef(new Animated.Value(0)).current;
  const waveAnim1 = useRef(new Animated.Value(0)).current;
  const waveAnim2 = useRef(new Animated.Value(0)).current;
  const particleAnims = useRef([...Array(30)].map(() => ({
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    opacity: new Animated.Value(0),
    scale: new Animated.Value(0),
  }))).current;
  const infinityParticle = useRef({
    translateX: new Animated.Value(0),
    translateY: new Animated.Value(0),
    scale: new Animated.Value(1),
  }).current;
  const orbAnim = useRef(new Animated.Value(0)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (loading) {
      // Main entrance animation
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 1,
          duration: 100,
          useNativeDriver: true,
        }),
        Animated.spring(scale, {
          toValue: 1,
          tension: 100,
          friction: 6,
          useNativeDriver: true,
        }),
      ]).start();

      // Continuous rotation animation
      const rotationAnimation = Animated.loop(
        Animated.timing(rotation, {
          toValue: 1,
          duration: 3000,
          useNativeDriver: true,
        })
      );

      // Enhanced pulse animation (smaller scale)
      const pulseAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseAnim, {
            toValue: 1.15,
            duration: 1200,
            useNativeDriver: true,
          }),
          Animated.timing(pulseAnim, {
            toValue: 1,
            duration: 1200,
            useNativeDriver: true,
          }),
        ])
      );

      // Staggered bouncing dots
      const dotAnimation = Animated.loop(
        Animated.stagger(300, [
          Animated.sequence([
            Animated.timing(dotAnim1, { toValue: -25, duration: 600, useNativeDriver: true }),
            Animated.timing(dotAnim1, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim2, { toValue: -25, duration: 600, useNativeDriver: true }),
            Animated.timing(dotAnim2, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
          Animated.sequence([
            Animated.timing(dotAnim3, { toValue: -25, duration: 600, useNativeDriver: true }),
            Animated.timing(dotAnim3, { toValue: 0, duration: 600, useNativeDriver: true }),
          ]),
        ])
      );

      // Multiple wave animations
      const waveAnimation1 = Animated.loop(
        Animated.timing(waveAnim1, {
          toValue: 1,
          duration: 4000,
          useNativeDriver: true,
        })
      );

      const waveAnimation2 = Animated.loop(
        Animated.timing(waveAnim2, {
          toValue: 1,
          duration: 6000,
          useNativeDriver: true,
        })
      );

      // Floating particles animation (more particles, less opacity)
      const particleAnimations = particleAnims.map((particle, index) => {
        const delay = index * 100;
        return Animated.loop(
          Animated.sequence([
            Animated.delay(delay),
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0.4 + Math.random() * 0.3,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0.7 + Math.random() * 0.4,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.translateX, {
                toValue: (Math.random() - 0.5) * 250,
                duration: 2500 + Math.random() * 2000,
                useNativeDriver: true,
              }),
              Animated.timing(particle.translateY, {
                toValue: (Math.random() - 0.5) * 350,
                duration: 2500 + Math.random() * 2000,
                useNativeDriver: true,
              }),
            ]),
            Animated.parallel([
              Animated.timing(particle.opacity, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
              Animated.timing(particle.scale, {
                toValue: 0,
                duration: 800,
                useNativeDriver: true,
              }),
            ]),
            Animated.timing(particle.translateX, { toValue: 0, duration: 0, useNativeDriver: true }),
            Animated.timing(particle.translateY, { toValue: 0, duration: 0, useNativeDriver: true }),
          ])
        );
      });

      // Infinity particle animation (big particle moving in infinity pattern)
      const infinityAnimation = Animated.loop(
        Animated.sequence([
          // Figure-8 / Infinity path animation
          Animated.parallel([
            Animated.timing(infinityParticle.translateX, {
              toValue: 80,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(infinityParticle.translateY, {
              toValue: -40,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(infinityParticle.translateX, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(infinityParticle.translateY, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(infinityParticle.translateX, {
              toValue: -80,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(infinityParticle.translateY, {
              toValue: 40,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
          Animated.parallel([
            Animated.timing(infinityParticle.translateX, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
            Animated.timing(infinityParticle.translateY, {
              toValue: 0,
              duration: 1500,
              useNativeDriver: true,
            }),
          ]),
        ])
      );

      // Orbiting animation
      const orbAnimation = Animated.loop(
        Animated.timing(orbAnim, {
          toValue: 1,
          duration: 8000,
          useNativeDriver: true,
        })
      );

      // Glow animation
      const glowAnimation = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(glowAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      );

      // Start all animations
      rotationAnimation.start();
      pulseAnimation.start();
      dotAnimation.start();
      waveAnimation1.start();
      waveAnimation2.start();
      orbAnimation.start();
      glowAnimation.start();
      infinityAnimation.start();
      particleAnimations.forEach(anim => anim.start());

      return () => {
        rotationAnimation.stop();
        pulseAnimation.stop();
        dotAnimation.stop();
        waveAnimation1.stop();
        waveAnimation2.stop();
        orbAnimation.stop();
        glowAnimation.stop();
        infinityAnimation.stop();
        particleAnimations.forEach(anim => anim.stop());
      };
    } else {
      Animated.parallel([
        Animated.timing(opacity, {
          toValue: 0,
          duration: 300,
          useNativeDriver: true,
        }),
        Animated.timing(scale, {
          toValue: 0.8,
          duration: 300,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [loading]);

  const spin = rotation.interpolate({
    inputRange: [0, 1],
    outputRange: ['0deg', '360deg'],
  });

  const wave1Translate = waveAnim1.interpolate({
    inputRange: [0, 1],
    outputRange: [-width, width * 1.5],
  });

  const wave2Translate = waveAnim2.interpolate({
    inputRange: [0, 1],
    outputRange: [width, -width * 1.5],
  });

  const orbX = orbAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 360],
  });

  const glowOpacity = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.3, 0.8],
  });

  if (!loading) return null;

  return (
    <Animated.View style={[styles.container, { opacity, transform: [{ scale }] }]}>
      {/* Animated Background Waves */}
      <Animated.View 
        style={[
          styles.wave1,
          { transform: [{ translateX: wave1Translate }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.wave2,
          { transform: [{ translateX: wave2Translate }] }
        ]} 
      />
      <Animated.View 
        style={[
          styles.wave3,
          { transform: [{ translateX: wave1Translate }] }
        ]} 
      />

      {/* Glowing Background Orb */}
      <Animated.View 
        style={[
          styles.backgroundGlow,
          { opacity: glowOpacity }
        ]} 
      />

      {/* Infinity Particle - Big particle moving in infinity pattern */}
      <Animated.View
        style={[
          styles.infinityParticle,
          {
            transform: [
              { translateX: infinityParticle.translateX },
              { translateY: infinityParticle.translateY },
              { scale: infinityParticle.scale },
            ],
          }
        ]}
      >
        <View style={styles.infinityCore} />
      </Animated.View>

      {/* Floating Particles */}
      <View style={styles.particlesContainer}>
        {particleAnims.map((particle, index) => (
          <Animated.View
            key={index}
            style={[
              styles.particle,
              {
                left: `${Math.random() * 80 + 10}%`,
                top: `${Math.random() * 80 + 10}%`,
                backgroundColor: [
                  '#00FFFF', '#FF00FF', '#FFFF00', '#00FF80', 
                  '#FF0080', '#80FF00', '#0080FF', '#FF8000'
                ][index % 8],
                transform: [
                  { translateX: particle.translateX },
                  { translateY: particle.translateY },
                  { scale: particle.scale },
                ],
                opacity: particle.opacity,
              }
            ]}
          />
        ))}
      </View>

      {/* Orbiting Elements */}
      <Animated.View 
        style={[
          styles.orbitContainer,
          { 
            transform: [
              { rotateZ: orbX.interpolate({
                inputRange: [0, 360],
                outputRange: ['0deg', '360deg'],
              })}
            ]
          }
        ]}
      >
        <View style={styles.orbitDot1} />
        <View style={styles.orbitDot2} />
        <View style={styles.orbitDot3} />
      </Animated.View>

      {/* Main Loading Content */}
      <View style={styles.content}>
        {/* Enhanced Gradient Spinner */}
        <Animated.View 
          style={[
            styles.spinnerContainer,
            { 
              transform: [
                { rotate: spin },
                { scale: pulseAnim }
              ]
            }
          ]}
        >
          <View style={styles.gradientSpinner}>
            <View style={styles.innerCircle}>
              <View style={styles.coreGlow} />
            </View>
          </View>
          
          {/* Outer glow ring */}
          <Animated.View 
            style={[
              styles.outerGlow,
              { opacity: glowOpacity }
            ]}
          />
        </Animated.View>

        {/* Enhanced Bouncing Dots */}
        <View style={styles.dotsContainer}>
          <Animated.View 
            style={[
              styles.dot, 
              styles.dot1,
              { transform: [{ translateY: dotAnim1 }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              styles.dot2,
              { transform: [{ translateY: dotAnim2 }] }
            ]} 
          />
          <Animated.View 
            style={[
              styles.dot, 
              styles.dot3,
              { transform: [{ translateY: dotAnim3 }] }
            ]} 
          />
        </View>

        {/* Loading Text with Glow */}
        {loadingText && (
          <Animated.Text 
            style={[
              styles.text,
              { 
                transform: [{ scale: pulseAnim }],
                textShadowColor: `rgba(0, 255, 255, ${glowOpacity._value})`,
              }
            ]}
          >
            {loadingText}
          </Animated.Text>
        )}
        
        {!loadingText && (
          <Animated.Text 
            style={[
              styles.defaultText,
              { 
                textShadowColor: `rgba(255, 0, 255, ${glowOpacity._value})`,
              }
            ]}
          >
            Loading...
          </Animated.Text>
        )}
      </View>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(10, 10, 20, 0.95)",
    zIndex: 1000,
    overflow: 'hidden',
  },
  backgroundGlow: {
    position: 'absolute',
    top: '30%',
    left: '25%',
    right: '25%',
    bottom: '30%',
    borderRadius: 200,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 50,
    elevation: 20,
  },
  wave1: {
    position: 'absolute',
    top: '20%',
    width: width * 3,
    height: 150,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 75,
    transform: [{ rotate: '2deg' }],
  },
  wave2: {
    position: 'absolute',
    top: '60%',
    width: width * 3,
    height: 120,
    backgroundColor: 'rgba(255, 0, 255, 0.08)',
    borderRadius: 60,
    transform: [{ rotate: '-3deg' }],
  },
  wave3: {
    position: 'absolute',
    top: '80%',
    width: width * 3,
    height: 100,
    backgroundColor: 'rgba(255, 255, 0, 0.06)',
    borderRadius: 50,
    transform: [{ rotate: '1deg' }],
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  spinnerContainer: {
    marginBottom: 50,
    position: 'relative',
  },
  gradientSpinner: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: 'transparent',
    borderWidth: 4,
    borderTopColor: '#00FFFF',
    borderRightColor: '#FF00FF',
    borderBottomColor: '#FFFF00',
    borderLeftColor: '#00FF80',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 12,
  },
  innerCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    margin: 6,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#fff',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 6,
  },
  coreGlow: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: 'rgba(0, 255, 255, 0.3)',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 8,
  },
  outerGlow: {
    position: 'absolute',
    width: 110,
    height: 110,
    borderRadius: 55,
    backgroundColor: 'transparent',
    borderWidth: 1.5,
    borderColor: 'rgba(0, 255, 255, 0.25)',
    top: -15,
    left: -15,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 4,
  },
  orbitContainer: {
    position: 'absolute',
    width: 200,
    height: 200,
    left: '50%',
    top: '50%',
    marginLeft: -100,
    marginTop: -100,
  },
  orbitDot1: {
    position: 'absolute',
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FFFF',
    top: 0,
    left: '50%',
    marginLeft: -4,
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
  },
  orbitDot2: {
    position: 'absolute',
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#FF00FF',
    bottom: 0,
    left: '50%',
    marginLeft: -3,
    shadowColor: '#FF00FF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 6,
    elevation: 8,
  },
  orbitDot3: {
    position: 'absolute',
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: '#FFFF00',
    top: '50%',
    right: 0,
    marginTop: -3.5,
    shadowColor: '#FFFF00',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 7,
    elevation: 9,
  },
  dotsContainer: {
    flexDirection: 'row',
    marginBottom: 40,
    alignItems: 'flex-end',
  },
  dot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginHorizontal: 6,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
  },
  dot1: {
    backgroundColor: '#00FFFF',
    shadowColor: '#00FFFF',
  },
  dot2: {
    backgroundColor: '#FF00FF',
    shadowColor: '#FF00FF',
  },
  dot3: {
    backgroundColor: '#FFFF00',
    shadowColor: '#FFFF00',
  },
  text: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 1.5,
    textShadowOffset: { width: 0, height: 0 },
    textShadowOpacity: 1,
    textShadowRadius: 8,
  },
  defaultText: {
    color: "#FFFFFF",
    fontSize: 16,
    fontWeight: "600",
    textAlign: "center",
    letterSpacing: 2,
    textShadowOffset: { width: 0, height: 0 },
    textShadowOpacity: 1,
    textShadowRadius: 8,
  },
  particlesContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  particle: {
    position: 'absolute',
    width: 4,
    height: 4,
    borderRadius: 2,
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.7,
    shadowRadius: 4,
    elevation: 6,
  },
  infinityParticle: {
    position: 'absolute',
    width: 20,
    height: 20,
    borderRadius: 10,
    left: '50%',
    top: '50%',
    marginLeft: -10,
    marginTop: -10,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 255, 255, 0.2)',
    borderWidth: 2,
    borderColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 15,
    elevation: 15,
  },
  infinityCore: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: '#00FFFF',
    shadowColor: '#00FFFF',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 1,
    shadowRadius: 8,
    elevation: 10,
  },
});

export default Loading;