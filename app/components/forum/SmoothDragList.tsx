import React, { useRef, useState, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  PanResponder,
  Vibration,
  ScrollView,
  LayoutChangeEvent,
  ViewStyle,
  GestureResponderEvent,
  PanResponderGestureState,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';

// Simple types
interface DragState {
  isDragging: boolean;
  draggedIndex: number | null;
  insertAtIndex: number | null;
  initialTouchY: number; // 🔧 ADD: Track initial touch position
  initialItemY: number;   // 🔧 ADD: Track initial item position
}

interface ItemLayout {
  y: number;
  height: number;
}

interface SimpleDragListProps<T> {
  items: T[];
  onReorder: (newItems: T[]) => void;
  renderItem: (item: T, isDragging?: boolean, dragHandle?: React.ReactNode) => React.ReactNode;
  keyExtractor: (item: T) => string;
  canDrag?: (item: T) => boolean;
  disabled?: boolean;
  style?: ViewStyle;
  contentContainerStyle?: ViewStyle;
  showsVerticalScrollIndicator?: boolean;
  // Simple config
  insertionLineColor?: string;
  gapSize?: number; // How big the gap detection zone is
}

// Simple drag handle with integrated gesture handling
const SimpleDragHandle: React.FC<{
  onStartDrag: (touchY: number) => void; // 🔧 FIX: Pass touch Y position
  canDrag: boolean;
  isDragging: boolean;
}> = ({ onStartDrag, canDrag, isDragging }) => {
  const [isPressing, setIsPressing] = useState(false);

  // 🔧 FIX: Integrated pan responder directly in drag handle
  const handlePanResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => canDrag,
    onMoveShouldSetPanResponder: () => false, // Don't interfere with main drag
    
    onPanResponderGrant: (evt) => {
      if (!canDrag) return;
      console.log('🟢 Drag handle pressed - starting drag');
      setIsPressing(true);
      // 🔧 FIX: Pass the initial touch Y position
      onStartDrag(evt.nativeEvent.pageY);
    },
    
    onPanResponderRelease: () => {
      setIsPressing(false);
    },
    
    onPanResponderTerminate: () => {
      setIsPressing(false);
    },
  }), [canDrag, onStartDrag]);

  if (!canDrag) return null;

  const dotColor = isDragging ? '#FFD700' : isPressing ? '#32CD32' : '#00FFFF';

  return (
    <View 
      style={[styles.dragHandle, isDragging && styles.dragHandleActive]}
      {...handlePanResponder.panHandlers}
    >
      <View style={styles.dragDots}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.dragDots}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
      <View style={styles.dragDots}>
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
        <View style={[styles.dot, { backgroundColor: dotColor }]} />
      </View>
    </View>
  );
};

const SimpleDragList = <T extends any>({
  items,
  onReorder,
  renderItem,
  keyExtractor,
  canDrag = () => true,
  disabled = false,
  style,
  contentContainerStyle,
  showsVerticalScrollIndicator = false,
  insertionLineColor = '#00FFFF',
  gapSize = 50,
}: SimpleDragListProps<T>) => {
  
  // Simple refs
  const scrollViewRef = useRef<ScrollView>(null);
  const itemLayouts = useRef<Map<string, ItemLayout>>(new Map());
  const containerY = useRef(0);
  const scrollY = useRef(0);
  
  // Simple animations
  const dragY = useRef(new Animated.Value(0)).current;
  const dragScale = useRef(new Animated.Value(1)).current;
  const itemAnimations = useRef<Map<string, Animated.Value>>(new Map());
  
  // Simple state
  const [dragState, setDragState] = useState<DragState>({
    isDragging: false,
    draggedIndex: null,
    insertAtIndex: null,
    initialTouchY: 0,
    initialItemY: 0,
  });

  // 🎯 STEP 1: Start drag - ONLY scale up, nothing else happens
  const startDrag = useCallback((index: number, touchY: number) => {
    console.log('🚀 Starting drag for index:', index, 'at touchY:', touchY);
    
    // Get the initial position of the dragged item
    const itemId = keyExtractor(items[index]);
    const itemLayout = itemLayouts.current.get(itemId);
    const initialItemY = itemLayout?.y || 0;
    
    setDragState({
      isDragging: true,
      draggedIndex: index,
      insertAtIndex: null,
      initialTouchY: touchY, // 🔧 FIX: Store initial touch position
      initialItemY: initialItemY, // 🔧 FIX: Store initial item position
    });
    
    // ONLY animate the dragged item
    Animated.spring(dragScale, {
      toValue: 1.05,
      useNativeDriver: true,
    }).start();
    
    Vibration.vibrate(30);
  }, [dragScale, keyExtractor, items]);

  // 🎯 STEP 2: Calculate insertion index based on drag position
  const calculateInsertionIndex = useCallback((pageY: number): number | null => {
    if (!dragState.isDragging || dragState.draggedIndex === null) return null;
    
    const relativeY = pageY - containerY.current + scrollY.current;
    const layouts = Array.from(itemLayouts.current.entries());
    
    // Find where to insert based on Y position
    for (let i = 0; i < items.length; i++) {
      const itemId = keyExtractor(items[i]);
      const layout = itemLayouts.current.get(itemId);
      
      if (!layout) continue;
      
      const itemCenterY = layout.y + (layout.height / 2);
      
      // If dragging above this item's center, insert before it
      if (relativeY < itemCenterY) {
        return i;
      }
    }
    
    // If we're past all items, insert at the end
    return items.length;
  }, [dragState.isDragging, dragState.draggedIndex, items, keyExtractor]);

  // 🎯 STEP 3: Calculate which items need to move and by how much
  const calculateItemOffsets = useCallback((): Map<string, number> => {
    const offsets = new Map<string, number>();
    
    if (!dragState.isDragging || dragState.draggedIndex === null || dragState.insertAtIndex === null) {
      return offsets; // No movements
    }
    
    const { draggedIndex, insertAtIndex } = dragState;
    const draggedItemId = keyExtractor(items[draggedIndex]);
    const draggedLayout = itemLayouts.current.get(draggedItemId);
    
    if (!draggedLayout) return offsets;
    
    const draggedHeight = draggedLayout.height + 12; // Include margin
    
    // Determine which items need to move
    if (insertAtIndex > draggedIndex) {
      // Moving down: items between draggedIndex and insertAtIndex move up
      for (let i = draggedIndex + 1; i < insertAtIndex; i++) {
        const itemId = keyExtractor(items[i]);
        offsets.set(itemId, -draggedHeight);
      }
    } else if (insertAtIndex < draggedIndex) {
      // Moving up: items between insertAtIndex and draggedIndex move down
      for (let i = insertAtIndex; i < draggedIndex; i++) {
        const itemId = keyExtractor(items[i]);
        offsets.set(itemId, draggedHeight);
      }
    }
    
    return offsets;
  }, [dragState, items, keyExtractor]);

  // 🎯 STEP 4: Animate items to their target positions
  const animateItems = useCallback(() => {
    const offsets = calculateItemOffsets();
    
    items.forEach((item) => {
      const itemId = keyExtractor(item);
      
      // Ensure animation exists
      if (!itemAnimations.current.has(itemId)) {
        itemAnimations.current.set(itemId, new Animated.Value(0));
      }
      
      const animation = itemAnimations.current.get(itemId)!;
      const targetOffset = offsets.get(itemId) || 0;
      
      // Animate to target position
      Animated.spring(animation, {
        toValue: targetOffset,
        tension: 200,
        friction: 20,
        useNativeDriver: true,
      }).start();
    });
  }, [calculateItemOffsets, items, keyExtractor]);

  // 🎯 STEP 5: Fixed pan responder - simpler and more reliable
  const panResponder = useMemo(() => PanResponder.create({
    onStartShouldSetPanResponder: () => dragState.isDragging,
    onMoveShouldSetPanResponder: () => dragState.isDragging,
    
    onPanResponderGrant: () => {
      console.log('📱 Pan responder activated - finger locked to item');
    },
    
    onPanResponderMove: (evt: GestureResponderEvent, gestureState: PanResponderGestureState) => {
      if (!dragState.isDragging) return;
      
      // 🔧 FIX: Calculate absolute position relative to initial touch
      const currentTouchY = evt.nativeEvent.pageY;
      const deltaY = currentTouchY - dragState.initialTouchY;
      
      // 🔧 FIX: Set absolute position - no cumulative errors!
      dragY.setValue(deltaY);
      
      console.log('📍 Touch Y:', currentTouchY, 'Initial:', dragState.initialTouchY, 'Delta:', deltaY);
      
      // Calculate new insertion index using current touch position
      const newInsertAtIndex = calculateInsertionIndex(currentTouchY);
      
      // Only update if insertion index changed
      if (newInsertAtIndex !== dragState.insertAtIndex) {
        console.log('🎯 Insertion index changed:', dragState.insertAtIndex, '→', newInsertAtIndex);
        setDragState(prev => ({ ...prev, insertAtIndex: newInsertAtIndex }));
        Vibration.vibrate(20);
      }
    },
    
    onPanResponderRelease: () => {
      console.log('👋 Drag completed');
      
      const { draggedIndex, insertAtIndex } = dragState;
      
      if (draggedIndex !== null && insertAtIndex !== null && insertAtIndex !== draggedIndex) {
        // 🔧 FIX: Immediately reset animations before reordering
        console.log('🔄 Reordering - resetting animations instantly');
        // Delay the drag state reset to prevent color flash during reorder
setTimeout(() => resetDrag(true), 50); // Small delay to prevent color flash
        
        // Perform reorder after a tiny delay to ensure animations are reset
        setTimeout(() => {
          const newItems = [...items];
          const [draggedItem] = newItems.splice(draggedIndex, 1);
          
          const finalInsertIndex = insertAtIndex > draggedIndex ? insertAtIndex - 1 : insertAtIndex;
          newItems.splice(finalInsertIndex, 0, draggedItem);
          
          console.log('🔄 Reordering complete');
          onReorder(newItems);
          Vibration.vibrate(50);
        }, 16); // One frame delay
      } else {
        // No reorder - normal smooth reset
        resetDrag(false);
      }
    },
    
    onPanResponderTerminate: () => {
      console.log('⚡ Drag terminated');
      resetDrag(false); // Normal smooth reset for termination
    },
  }), [dragState, calculateInsertionIndex, items, onReorder]);

  // Reset drag state and animations smoothly
  const resetDrag = useCallback((isReordering = false) => {
    // Reset state
    setDragState({
      isDragging: false,
      draggedIndex: null,
      insertAtIndex: null,
      initialTouchY: 0,
      initialItemY: 0,
    });
    
if (isReordering) {
  // 🔧 FIX: When reordering, immediately reset animations without bouncing
  dragY.setValue(0);
  dragScale.setValue(1);
  
  // Reset all item animations instantly - no spring animation that causes bouncing
  itemAnimations.current.forEach(animation => {
    animation.setValue(0);
  });
} else {
  // Normal reset with smooth animations (for cancelled drags)
  Animated.parallel([
    Animated.spring(dragY, { toValue: 0, useNativeDriver: true }),
    Animated.spring(dragScale, { toValue: 1, useNativeDriver: true }),
    ...Array.from(itemAnimations.current.values()).map(animation =>
      Animated.spring(animation, { toValue: 0, useNativeDriver: true })
    ),
  ]).start();
}
  }, [dragY, dragScale]);

  // Animate items when insertion index changes
  React.useEffect(() => {
    animateItems();
  }, [animateItems]);

  // Handle layout measurement
  const handleItemLayout = useCallback((itemId: string) => (event: LayoutChangeEvent) => {
    const { y, height } = event.nativeEvent.layout;
    itemLayouts.current.set(itemId, { y, height });
  }, []);

  // Handle container layout
  const handleContainerLayout = useCallback((event: LayoutChangeEvent) => {
    containerY.current = event.nativeEvent.layout.y;
  }, []);

  // Handle scroll
  const handleScroll = useCallback((event: any) => {
    scrollY.current = event.nativeEvent.contentOffset.y;
  }, []);

  // Render insertion line
  const renderInsertionLine = useCallback(() => {
    if (!dragState.isDragging || dragState.insertAtIndex === null) return null;
    
    const { insertAtIndex } = dragState;
    let lineY = 0;
    
    if (insertAtIndex === 0) {
      // Insert at beginning
      const firstItemId = keyExtractor(items[0]);
      const firstLayout = itemLayouts.current.get(firstItemId);
      lineY = firstLayout ? firstLayout.y - 6 : 0;
    } else if (insertAtIndex >= items.length) {
      // Insert at end
      const lastItemId = keyExtractor(items[items.length - 1]);
      const lastLayout = itemLayouts.current.get(lastItemId);
      lineY = lastLayout ? lastLayout.y + lastLayout.height + 6 : 0;
    } else {
      // Insert between items
      const beforeItemId = keyExtractor(items[insertAtIndex - 1]);
      const beforeLayout = itemLayouts.current.get(beforeItemId);
      lineY = beforeLayout ? beforeLayout.y + beforeLayout.height + 6 : 0;
    }
    
    return (
      <View
        style={[
          styles.insertionLine,
          { top: lineY, backgroundColor: insertionLineColor }
        ]}
        pointerEvents="none"
      />
    );
  }, [dragState.isDragging, dragState.insertAtIndex, items, keyExtractor, insertionLineColor]);

  // Render item with drag handle
  const renderWrappedItem = useCallback((item: T, index: number) => {
    const itemId = keyExtractor(item);
    const isDragged = dragState.draggedIndex === index;
    const itemAnimation = itemAnimations.current.get(itemId);
    const isDraggable = canDrag(item);
    
    // Animation styles
    const animatedStyle: any = {};
    
    if (isDragged) {
      // Dragged item follows finger
      animatedStyle.transform = [
        { translateY: dragY },
        { scale: dragScale },
      ];
      animatedStyle.zIndex = 1000;
      animatedStyle.elevation = 10;
    } else if (itemAnimation) {
      // Other items slide to make room
      animatedStyle.transform = [{ translateY: itemAnimation }];
    }
    
    // Create drag handle with cleaner approach
    const dragHandle = (
      <SimpleDragHandle
        onStartDrag={(touchY) => startDrag(index, touchY)} // 🔧 FIX: Pass touch Y
        canDrag={isDraggable && !disabled}
        isDragging={isDragged}
      />
    );
    
    return (
      <Animated.View
        key={itemId}
        style={[styles.itemContainer, animatedStyle]}
        onLayout={handleItemLayout(itemId)}
      >
        {renderItem(item, isDragged, dragHandle)}
      </Animated.View>
    );
  }, [
    keyExtractor,
    dragState.draggedIndex,
    dragY,
    dragScale,
    canDrag,
    disabled,
    startDrag,
    renderItem,
    handleItemLayout,
  ]);

  if (disabled) {
    return (
      <ScrollView
        style={[styles.container, style]}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
      >
        {items.map((item, index) => (
          <View key={keyExtractor(item)} style={styles.itemContainer}>
            {renderItem(item, false, null)}
          </View>
        ))}
      </ScrollView>
    );
  }

  return (
    <View 
      style={[styles.container, style]}
      onLayout={handleContainerLayout}
      {...panResponder.panHandlers}
    >
      <ScrollView
        ref={scrollViewRef}
        style={styles.scrollView}
        contentContainerStyle={contentContainerStyle}
        showsVerticalScrollIndicator={showsVerticalScrollIndicator}
        scrollEnabled={!dragState.isDragging}
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        {items.map(renderWrappedItem)}
        {renderInsertionLine()}
      </ScrollView>
    </View>
  );
};

export default SimpleDragList;

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  itemContainer: {
    marginBottom: 12,
  },
  insertionLine: {
    position: 'absolute',
    left: 16,
    right: 16,
    height: 3,
    borderRadius: 1.5,
  },
  dragHandle: {
    width: 16,
    height: 18,
    backgroundColor: 'rgba(0, 255, 255, 0.1)',
    borderRadius: 4,
    borderWidth: 1,
    borderColor: 'rgba(0, 255, 255, 0.3)',
    padding: 2,
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  dragHandleActive: {
    backgroundColor: 'rgba(255, 215, 0, 0.2)',
    borderColor: 'rgba(255, 215, 0, 0.4)',
    transform: [{ scale: 1.1 }],
  },
  dragDots: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    paddingHorizontal: 1,
  },
  dot: {
    width: 3,
    height: 3,
    borderRadius: 1.5,
  },
});