import React, { useState, useRef, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  FlatList,
  Image,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { BlurView } from 'expo-blur';
import { useTheme } from '../../contexts/ThemeContext';
import { Theme } from '../../utils/theme';
import { Icon } from '../Icon';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

interface ProgressPhoto {
  id: string;
  uri: string;
  timestamp?: Date;
}

interface FullScreenPhotoViewerProps {
  visible: boolean;
  photos: ProgressPhoto[];
  initialIndex: number;
  onClose: () => void;
}

export const FullScreenPhotoViewer: React.FC<FullScreenPhotoViewerProps> = ({
  visible,
  photos,
  initialIndex,
  onClose,
}) => {
  const { theme, isDark } = useTheme();
  const styles = useMemo(() => createStyles(theme), [theme]);
  const [currentIndex, setCurrentIndex] = useState(initialIndex);
  const flatListRef = useRef<FlatList>(null);

  // Update current index when initialIndex changes
  React.useEffect(() => {
    if (visible && initialIndex >= 0 && initialIndex < photos.length) {
      setCurrentIndex(initialIndex);
      // Scroll to initial index when modal opens
      // Use a longer timeout to ensure FlatList is fully laid out
      const timeoutId = setTimeout(() => {
        try {
          flatListRef.current?.scrollToIndex({
            index: initialIndex,
            animated: false,
          });
        } catch (error) {
          // Fallback to scrollToOffset if scrollToIndex fails
          flatListRef.current?.scrollToOffset({
            offset: SCREEN_WIDTH * initialIndex,
            animated: false,
          });
        }
      }, 300);
      return () => clearTimeout(timeoutId);
    }
  }, [visible, initialIndex, photos.length]);

  const handleScroll = useCallback((event: any) => {
    const contentOffsetX = event.nativeEvent.contentOffset.x;
    const index = Math.round(contentOffsetX / SCREEN_WIDTH);
    if (index >= 0 && index < photos.length && index !== currentIndex) {
      setCurrentIndex(index);
    }
  }, [currentIndex, photos.length]);

  const renderPhoto = useCallback(({ item }: { item: ProgressPhoto }) => {
    return (
      <View style={styles.photoContainer}>
        <Image
          source={{ uri: item.uri }}
          style={styles.photo}
          resizeMode="contain"
        />
      </View>
    );
  }, [styles]);

  const getItemLayout = useCallback(
    (_: any, index: number) => ({
      length: SCREEN_WIDTH,
      offset: SCREEN_WIDTH * index,
      index,
    }),
    []
  );

  if (photos.length === 0) {
    return null;
  }

  // Glass button component matching SheetHeader pattern
  const GlassButton: React.FC<{
    onPress: () => void;
    children: React.ReactNode;
  }> = ({ onPress, children }) => {
    if (isDark) {
      return (
        <TouchableOpacity onPress={onPress} style={styles.glassButtonWrapper}>
          <View
            style={[
              styles.glassButton,
              { backgroundColor: theme.colors.background.card },
            ]}
          >
            {children}
          </View>
        </TouchableOpacity>
      );
    }

    return (
      <TouchableOpacity onPress={onPress} style={styles.glassButtonWrapper}>
        <BlurView intensity={100} tint="light" style={styles.glassButton}>
          {children}
        </BlurView>
      </TouchableOpacity>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      presentationStyle="pageSheet"
      onRequestClose={onClose}
    >
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Header with close button and photo counter */}
        <View style={styles.header}>
          <GlassButton onPress={onClose}>
            <Icon name="close" size={24} color={theme.colors.text.primary} />
          </GlassButton>

          <View style={styles.counterContainer}>
            <Text style={styles.counterText}>
              {currentIndex + 1} of {photos.length}
            </Text>
          </View>

          <View style={styles.headerSpacer} />
        </View>

        {/* Photo viewer */}
        <FlatList
          ref={flatListRef}
          data={photos}
          renderItem={renderPhoto}
          keyExtractor={(item) => item.id}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          getItemLayout={getItemLayout}
          onScrollToIndexFailed={(info) => {
            // Fallback: scroll to offset if scrollToIndex fails
            const wait = new Promise((resolve) => setTimeout(resolve, 500));
            wait.then(() => {
              flatListRef.current?.scrollToOffset({
                offset: info.averageItemLength * info.index,
                animated: true,
              });
            });
          }}
        />
      </SafeAreaView>
    </Modal>
  );
};

const createStyles = (theme: Theme) =>
  StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.background.page,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 16,
      paddingTop: 8,
      paddingBottom: 12,
      position: 'absolute',
      top: 0,
      left: 0,
      right: 0,
      zIndex: 10,
    },
    glassButtonWrapper: {
      width: 44,
      height: 44,
      borderRadius: 22,
      overflow: 'hidden',
    },
    glassButton: {
      width: 44,
      height: 44,
      borderRadius: 22,
      backgroundColor: theme.colors.background.card + 'F0',
      borderWidth: 0.5,
      borderColor: theme.colors.border.default,
      alignItems: 'center',
      justifyContent: 'center',
      shadowColor: theme.colors.black,
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 4,
      elevation: 3,
    },
    counterContainer: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    counterText: {
      fontSize: 16,
      fontWeight: '600',
      color: theme.colors.text.primary,
    },
    headerSpacer: {
      width: 44,
    },
    photoContainer: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
      justifyContent: 'center',
      alignItems: 'center',
      backgroundColor: theme.colors.background.page,
    },
    photo: {
      width: SCREEN_WIDTH,
      height: SCREEN_HEIGHT,
    },
  });
