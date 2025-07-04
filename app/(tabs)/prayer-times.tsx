import { IconSymbol } from '@/components/ui/IconSymbol';
import { Colors } from '@/constants/Colors';
import { useColorScheme } from '@/hooks/useColorScheme';
import { CalculationMethod, Coordinates, PrayerTimes } from 'adhan';
import * as Location from 'expo-location';
import React, { useEffect, useState } from 'react';
import {
    Alert,
    ScrollView,
    StatusBar,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

interface PrayerTime {
  name: string;
  time: Date;
  icon: string;
  isNext?: boolean;
}

export default function PrayerTimesScreen() {
  const colorScheme = useColorScheme();
  const [prayerTimes, setPrayerTimes] = useState<PrayerTime[]>([]);
  const [location, setLocation] = useState<string>('');
  const [coordinates, setCoordinates] = useState<{ latitude: number; longitude: number } | null>(null);
  const [loading, setLoading] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());

  const colors = Colors[colorScheme ?? 'light'];
  
  // Custom green theme for prayer times
  const prayerTheme = {
    primary: '#2E7D32', // Deep green
    primaryLight: '#4CAF50', // Material green
    secondary: '#66BB6A', // Light green
    background: colorScheme === 'dark' ? '#1B5E20' : '#F1F8E9', // Dark green / Light green bg
    cardBg: colorScheme === 'dark' ? '#2E7D32' : '#FFFFFF',
    text: colorScheme === 'dark' ? '#FFFFFF' : '#1B5E20',
    accent: '#81C784', // Soft green
    border: colorScheme === 'dark' ? '#4CAF50' : '#C8E6C9',
    nextPrayer: '#FF6B35', // Orange for next prayer highlight
    shadow: colorScheme === 'dark' ? '#000000' : '#2E7D32',
  };

  const requestLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission denied', 'Location permission is required to get accurate prayer times.');
        return;
      }

      setLoading(true);
      const userLocation = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = userLocation.coords;
      setCoordinates({ latitude, longitude });

      // Get address from coordinates
      const address = await Location.reverseGeocodeAsync({ latitude, longitude });
      if (address[0]) {
        setLocation(`${address[0].city}, ${address[0].country}`);
      }

      calculatePrayerTimes(latitude, longitude);
    } catch (error) {
      Alert.alert('Error', 'Failed to get location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const calculatePrayerTimes = (latitude: number, longitude: number) => {
    try {
      const coords = new Coordinates(latitude, longitude);
      const date = new Date();
      const params = CalculationMethod.MuslimWorldLeague();
      const prayerTimes = new PrayerTimes(coords, date, params);

      const times: PrayerTime[] = [
        {
          name: 'Fajr',
          time: prayerTimes.fajr,
          icon: 'sunrise',
        },
        {
          name: 'Sunrise',
          time: prayerTimes.sunrise,
          icon: 'sun.max',
        },
        {
          name: 'Dhuhr',
          time: prayerTimes.dhuhr,
          icon: 'sun.max',
        },
        {
          name: 'Asr',
          time: prayerTimes.asr,
          icon: 'sun.min',
        },
        {
          name: 'Maghrib',
          time: prayerTimes.maghrib,
          icon: 'sunset',
        },
        {
          name: 'Isha',
          time: prayerTimes.isha,
          icon: 'moon.stars',
        },
      ];

      // Find next prayer
      const now = new Date();
      const nextPrayerIndex = times.findIndex(prayer => prayer.time > now);
      if (nextPrayerIndex !== -1) {
        times[nextPrayerIndex].isNext = true;
      }

      setPrayerTimes(times);
    } catch (error) {
      Alert.alert('Error', 'Failed to calculate prayer times. Please check your location.');
    }
  };

  const handleManualLocationSubmit = async () => {
    if (!location.trim()) {
      Alert.alert('Error', 'Please enter a location.');
      return;
    }

    try {
      setLoading(true);
      const geocodedLocation = await Location.geocodeAsync(location);
      if (geocodedLocation.length > 0) {
        const { latitude, longitude } = geocodedLocation[0];
        setCoordinates({ latitude, longitude });
        calculatePrayerTimes(latitude, longitude);
      } else {
        Alert.alert('Error', 'Location not found. Please try a different location.');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to find location. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (date: Date) => {
    return date.toLocaleTimeString('en-US', {
      hour: '2-digit',
      minute: '2-digit',
      hour12: true,
    });
  };

  const getTimeUntilNext = (prayerTime: Date) => {
    const now = new Date();
    const diff = prayerTime.getTime() - now.getTime();
    
    if (diff <= 0) return '';
    
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
    
    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    } else {
      return `in ${minutes}m`;
    }
  };

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentDate(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(timer);
  }, []);

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: prayerTheme.background }]}>
      <StatusBar barStyle={colorScheme === 'dark' ? 'light-content' : 'dark-content'} />
      
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        <View style={[styles.header, { backgroundColor: prayerTheme.background }]}>
          <Text style={[styles.title, { color: prayerTheme.text }]}>
            🕌 Prayer Times
          </Text>
          <Text style={[styles.subtitle, { color: prayerTheme.text, opacity: 0.8 }]}>
            {currentDate.toLocaleDateString('en-US', { 
              weekday: 'long', 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </Text>
        </View>

        <View style={[styles.locationContainer, { backgroundColor: prayerTheme.background }]}>
          <View style={styles.inputContainer}>
            <TextInput
              style={[styles.input, { 
                backgroundColor: prayerTheme.cardBg,
                borderColor: prayerTheme.border,
                color: prayerTheme.text 
              }]}
              value={location}
              onChangeText={setLocation}
              placeholder="Enter city name or address"
              placeholderTextColor={prayerTheme.accent}
              onSubmitEditing={handleManualLocationSubmit}
            />
            <TouchableOpacity 
              style={[styles.searchButton, { backgroundColor: prayerTheme.primary }]}
              onPress={handleManualLocationSubmit}
              disabled={loading}
            >
              <IconSymbol name="magnifyingglass" size={20} color="white" />
            </TouchableOpacity>
          </View>
          
          <TouchableOpacity 
            style={[styles.locationButton, { backgroundColor: prayerTheme.primaryLight }]}
            onPress={requestLocationPermission}
            disabled={loading}
          >
            <IconSymbol name="location.fill" size={20} color="white" />
            <Text style={styles.locationButtonText}>
              {loading ? 'Getting Location...' : 'Use Current Location'}
            </Text>
          </TouchableOpacity>
        </View>

        {prayerTimes.length > 0 && (
          <View style={styles.prayerContainer}>
            {prayerTimes.map((prayer, index) => (
              <TouchableOpacity
                key={index}
                style={[
                  styles.prayerCard,
                  { 
                    backgroundColor: prayerTheme.cardBg,
                    borderColor: prayer.isNext ? prayerTheme.nextPrayer : prayerTheme.border,
                    borderWidth: prayer.isNext ? 3 : 1,
                    shadowColor: prayerTheme.shadow,
                  }
                ]}
                activeOpacity={0.7}
              >
                <View style={styles.prayerHeader}>
                  <View style={styles.prayerIconContainer}>
                    <IconSymbol 
                      name={prayer.icon as any} 
                      size={28} 
                      color={prayer.isNext ? prayerTheme.nextPrayer : prayerTheme.accent} 
                    />
                  </View>
                  <View style={styles.prayerInfo}>
                    <Text style={[styles.prayerName, { color: prayerTheme.text }]}>
                      {prayer.name}
                    </Text>
                    {prayer.isNext && (
                      <Text style={[styles.nextPrayerText, { color: prayerTheme.nextPrayer }]}>
                        ⏰ Next Prayer
                      </Text>
                    )}
                  </View>
                </View>
                
                <View style={styles.prayerTimeContainer}>
                  <Text style={[styles.prayerTime, { color: prayer.isNext ? prayerTheme.nextPrayer : prayerTheme.text }]}>
                    {formatTime(prayer.time)}
                  </Text>
                  {prayer.isNext && (
                    <Text style={[styles.countdown, { color: prayerTheme.nextPrayer }]}>
                      {getTimeUntilNext(prayer.time)}
                    </Text>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {prayerTimes.length === 0 && (
          <View style={[styles.emptyState, { backgroundColor: prayerTheme.background }]}>
            <IconSymbol name="location.slash" size={64} color={prayerTheme.accent} />
            <Text style={[styles.emptyStateText, { color: prayerTheme.text }]}>
              🕌 Enter a location to view prayer times
            </Text>
            <Text style={[styles.emptyStateSubtext, { color: prayerTheme.text, opacity: 0.7 }]}>
              Search for a city or use your current location
            </Text>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  header: {
    padding: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 16,
    opacity: 0.7,
  },
  locationContainer: {
    paddingHorizontal: 20,
    marginBottom: 20,
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    alignItems: 'center',
  },
  input: {
    flex: 1,
    height: 50,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    fontSize: 16,
    marginRight: 8,
  },
  searchButton: {
    width: 50,
    height: 50,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    gap: 8,
  },
  locationButtonText: {
    color: 'white',
    fontSize: 16,
    fontWeight: '600',
  },
  prayerContainer: {
    paddingHorizontal: 20,
    gap: 16,
    paddingBottom: 20,
  },
  prayerCard: {
    borderRadius: 20,
    padding: 24,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 6,
    marginBottom: 4,
  },
  prayerHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  prayerIconContainer: {
    marginRight: 12,
  },
  prayerInfo: {
    flex: 1,
  },
  prayerName: {
    fontSize: 18,
    fontWeight: '600',
  },
  nextPrayerText: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  prayerTimeContainer: {
    alignItems: 'flex-end',
  },
  prayerTime: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  countdown: {
    fontSize: 12,
    fontWeight: '500',
    marginTop: 2,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
    paddingTop: 60,
  },
  emptyStateText: {
    fontSize: 20,
    fontWeight: '600',
    marginTop: 20,
    textAlign: 'center',
  },
  emptyStateSubtext: {
    fontSize: 16,
    opacity: 0.7,
    marginTop: 8,
    textAlign: 'center',
  },
}); 