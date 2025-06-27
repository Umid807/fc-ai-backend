import React, { useState, useCallback, useRef, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Animated,
  Vibration,
  Dimensions,
  Alert,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';

// Security utilities
import { validatePostContent, secureLog } from '../../utils/security';

// Types
interface TextStyle {
  fontSize: number;
  fontWeight: 'normal' | 'bold';
  fontStyle: 'normal' | 'italic';
  textDecorationLine: 'none' | 'underline' | 'line-through' | 'shadow' | 'outline' | 'gradient';
  textAlign: 'left' | 'center' | 'right' | 'justify';
  color: string;
  fontFamily: string;
}

interface TableData {
  template: string;
  headers: string[];
  rows: string[][];
  styling: {
    theme: 'blue' | 'gold' | 'dark' | 'green' | 'purple';
    showBorders: boolean;
    alternateRows: boolean;
    headerStyle: 'bold' | 'normal';
  };
}

interface TemplateSection {
  id: string;
  label: string;
  content: string;
  style: TextStyle;
  config: {
    placeholder: string;
    minHeight: number;
    maxHeight?: number;
    allowEmpty: boolean;
    type: string;
  };
  order: number;
  isCollapsed: boolean;
  isEditing: boolean;
  tableData?: TableData;
}

interface TableSectionEditorProps {
  section: TemplateSection;
  onContentChange: (content: string) => void;
  onStyleUpdate: (styleUpdates: Partial<TextStyle>) => void;
  onSectionUpdate: (updates: Partial<TemplateSection>) => void;
  userVIPStatus: boolean;
  disabled: boolean;
}

// Constants
const { width: SCREEN_WIDTH } = Dimensions.get('window');

// Table Templates - The GENIUS Strategy!
const TABLE_TEMPLATES = [
  // Basic Templates (Free)
  {
    id: '2x3',
    name: 'Small Comparison',
    rows: 2,
    cols: 3,
    category: 'basic',
    isVIP: false,
    description: 'Perfect for quick comparisons',
    headers: ['Player', 'Rating', 'Price'],
    sampleData: [
      ['Messi', '94', '1.2M'],
      ['Ronaldo', '91', '900K'],
    ],
  },
  {
    id: '3x3',
    name: 'Squad Core',
    rows: 3,
    cols: 3,
    category: 'basic',
    isVIP: false,
    description: 'Essential squad members',
    headers: ['Player', 'Rating', 'Price'],
    sampleData: [
      ['Messi', '94', '1.2M'],
      ['Ronaldo', '91', '900K'],
      ['Mbappé', '92', '1.5M'],
    ],
  },
  {
    id: '4x3',
    name: 'Starting XI Preview',
    rows: 4,
    cols: 3,
    category: 'basic',
    isVIP: false,
    description: 'Key starting players',
    headers: ['Player', 'Rating', 'Price'],
    sampleData: [
      ['Messi', '94', '1.2M'],
      ['Ronaldo', '91', '900K'],
      ['Mbappé', '92', '1.5M'],
      ['Haaland', '88', '800K'],
    ],
  },
  {
    id: '5x3',
    name: 'Full Squad Section',
    rows: 5,
    cols: 3,
    category: 'basic',
    isVIP: false,
    description: 'Complete squad breakdown',
    headers: ['Player', 'Rating', 'Price'],
    sampleData: [
      ['Messi', '94', '1.2M'],
      ['Ronaldo', '91', '900K'],
      ['Mbappé', '92', '1.5M'],
      ['Haaland', '88', '800K'],
      ['Salah', '89', '750K'],
    ],
  },
  
  // Detailed Templates (Free)
  {
    id: '3x4',
    name: 'Detailed Stats',
    rows: 3,
    cols: 4,
    category: 'detailed',
    isVIP: false,
    description: 'More detailed player data',
    headers: ['Player', 'Rating', 'Goals', 'Price'],
    sampleData: [
      ['Messi', '94', '12', '1.2M'],
      ['Ronaldo', '91', '8', '900K'],
      ['Mbappé', '92', '15', '1.5M'],
    ],
  },
  {
    id: '4x4',
    name: 'Complete Analysis',
    rows: 4,
    cols: 4,
    category: 'detailed',
    isVIP: false,
    description: 'Full player breakdown',
    headers: ['Player', 'Rating', 'Goals', 'Price'],
    sampleData: [
      ['Messi', '94', '12', '1.2M'],
      ['Ronaldo', '91', '8', '900K'],
      ['Mbappé', '92', '15', '1.5M'],
      ['Haaland', '88', '18', '800K'],
    ],
  },
  
  // Advanced Templates (VIP)
  {
    id: '5x4',
    name: 'Pro Comparison',
    rows: 5,
    cols: 4,
    category: 'advanced',
    isVIP: true,
    description: 'Professional analysis table',
    headers: ['Player', 'Rating', 'Goals', 'Price'],
    sampleData: [
      ['Messi', '94', '12', '1.2M'],
      ['Ronaldo', '91', '8', '900K'],
      ['Mbappé', '92', '15', '1.5M'],
      ['Haaland', '88', '18', '800K'],
      ['Salah', '89', '10', '750K'],
    ],
  },
  {
    id: '3x5',
    name: 'Ultimate Stats',
    rows: 3,
    cols: 5,
    category: 'advanced',
    isVIP: true,
    description: 'Comprehensive player data',
    headers: ['Player', 'Rating', 'Goals', 'Assists', 'Price'],
    sampleData: [
      ['Messi', '94', '12', '8', '1.2M'],
      ['Ronaldo', '91', '8', '3', '900K'],
      ['Mbappé', '92', '15', '7', '1.5M'],
    ],
  },
  {
    id: '5x5',
    name: 'Master Analysis',
    rows: 5,
    cols: 5,
    category: 'advanced',
    isVIP: true,
    description: 'Ultimate comparison table',
    headers: ['Player', 'Rating', 'Goals', 'Assists', 'Price'],
    sampleData: [
      ['Messi', '94', '12', '8', '1.2M'],
      ['Ronaldo', '91', '8', '3', '900K'],
      ['Mbappé', '92', '15', '7', '1.5M'],
      ['Haaland', '88', '18', '4', '800K'],
      ['Salah', '89', '10', '6', '750K'],
    ],
  },
];

// Gaming-Specific Header Presets
const HEADER_PRESETS = {
  player_basic: ['Player', 'Rating', 'Price'],
  player_detailed: ['Player', 'Rating', 'Goals', 'Price'],
  player_complete: ['Player', 'Rating', 'Goals', 'Assists', 'Price'],
  match_stats: ['Stat', 'Team A', 'Team B'],
  tournament: ['Team', 'Wins', 'Points'],
  squad_value: ['Player', 'Value', 'Change'],
  tactics: ['Formation', 'Style', 'Rating'],
};

// Theme configurations
const TABLE_THEMES = {
  blue: {
    name: 'Ocean Blue',
    headerBg: '#003d82',
    headerText: '#FFFFFF',
    rowBg: '#001122',
    altRowBg: '#002244',
    borderColor: '#0066CC',
    textColor: '#FFFFFF',
  },
  gold: {
    name: 'Champions Gold',
    headerBg: '#B8860B',
    headerText: '#000000',
    rowBg: '#1a1a00',
    altRowBg: '#2d2d00',
    borderColor: '#FFD700',
    textColor: '#FFD700',
  },
  dark: {
    name: 'Midnight',
    headerBg: '#1a1a1a',
    headerText: '#FFFFFF',
    rowBg: '#0d0d0d',
    altRowBg: '#1a1a1a',
    borderColor: '#333333',
    textColor: '#CCCCCC',
  },
  green: {
    name: 'Matrix Green',
    headerBg: '#006400',
    headerText: '#FFFFFF',
    rowBg: '#001100',
    altRowBg: '#002200',
    borderColor: '#32CD32',
    textColor: '#32CD32',
  },
  purple: {
    name: 'Royal Purple',
    headerBg: '#4B0082',
    headerText: '#FFFFFF',
    rowBg: '#1a0033',
    altRowBg: '#2d0066',
    borderColor: '#9370DB',
    textColor: '#DDA0DD',
  },
};

const TableSectionEditor: React.FC<TableSectionEditorProps> = ({
  section,
  onContentChange,
  onStyleUpdate,
  onSectionUpdate,
  userVIPStatus,
  disabled,
}) => {
  const { t } = useTranslation();
  
  // Animation refs
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const previewAnimation = useRef(new Animated.Value(1)).current;
  
  // Create default styling
  const defaultStyling = {
    theme: 'blue' as const,
    showBorders: true,
    alternateRows: true,
    headerStyle: 'bold' as const,
  };
  
  // Default table data
  const defaultTableData: TableData = {
    template: '3x3',
    headers: ['Player', 'Rating', 'Price'],
    rows: [['', '', ''], ['', '', ''], ['', '', '']],
    styling: defaultStyling,
  };
  
  // State management with comprehensive safety checks
  const [currentTableData, setCurrentTableData] = useState<TableData>(() => {
    if (!section || !section.tableData) {
      return defaultTableData;
    }
    
    const tableData = section.tableData;
    
    // Ensure all required properties exist with proper types
    return {
      template: typeof tableData.template === 'string' ? tableData.template : '3x3',
      headers: Array.isArray(tableData.headers) ? tableData.headers : ['Player', 'Rating', 'Price'],
      rows: Array.isArray(tableData.rows) ? tableData.rows.map(row => 
        Array.isArray(row) ? row : ['', '', '']
      ) : [['', '', ''], ['', '', ''], ['', '', '']],
      styling: {
        theme: tableData.styling?.theme || 'blue',
        showBorders: typeof tableData.styling?.showBorders === 'boolean' ? tableData.styling.showBorders : true,
        alternateRows: typeof tableData.styling?.alternateRows === 'boolean' ? tableData.styling.alternateRows : true,
        headerStyle: tableData.styling?.headerStyle || 'bold',
      },
    };
  });
  
  const [showTemplateSelector, setShowTemplateSelector] = useState(false);
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const [editingCell, setEditingCell] = useState<{ row: number; col: number } | null>(null);
  const [errors, setErrors] = useState<{ [key: string]: string }>({});
  const [isDirty, setIsDirty] = useState(false);
  
  // Auto-save timer
  const autoSaveTimer = useRef<NodeJS.Timeout>();
  
  // Initialize animation
  useEffect(() => {
    Animated.spring(slideAnimation, {
      toValue: 1,
      useNativeDriver: true,
      tension: 120,
      friction: 8,
    }).start();
  }, [slideAnimation]);
  
  // Get current template info with safety check
  const currentTemplate = useMemo(() => {
    const template = TABLE_TEMPLATES.find(t => t.id === currentTableData?.template);
    return template || TABLE_TEMPLATES[0];
  }, [currentTableData?.template]);
  
  // Get current theme with comprehensive safety checks
  const currentTheme = useMemo(() => {
    const themeKey = currentTableData?.styling?.theme || 'blue';
    return TABLE_THEMES[themeKey] || TABLE_THEMES.blue;
  }, [currentTableData?.styling?.theme]);
  
  // Format table for content preview
  const formatTableForContent = useCallback((tableData: TableData) => {
    if (!tableData || !Array.isArray(tableData.headers) || !Array.isArray(tableData.rows)) {
      return 'Table configuration...';
    }
    
    let content = '';
    
    // Add headers
    content += tableData.headers.join(' | ') + '\n';
    content += tableData.headers.map(() => '---').join(' | ') + '\n';
    
    // Add rows
    tableData.rows.forEach(row => {
      if (Array.isArray(row)) {
        content += row.join(' | ') + '\n';
      }
    });
    
    return content.trim();
  }, []);
  
  // Auto-save functionality
  const autoSave = useCallback(() => {
    if (autoSaveTimer.current) {
      clearTimeout(autoSaveTimer.current);
    }
    
    autoSaveTimer.current = setTimeout(() => {
      try {
        // Update section with table data
        onSectionUpdate({
          tableData: currentTableData,
          content: formatTableForContent(currentTableData),
        });
        
        // Also update content for preview
        onContentChange(formatTableForContent(currentTableData));
        
        setIsDirty(false);
        
        secureLog('Table auto-saved', {
          sectionId: section?.id || 'unknown',
          template: currentTableData?.template || 'unknown',
          theme: currentTableData?.styling?.theme || 'blue',
          cellCount: (currentTableData?.rows?.length || 0) * (currentTableData?.headers?.length || 0),
        });
      } catch (error) {
        console.warn('Error in table auto-save:', error);
        onContentChange('Table configuration...');
      }
    }, 2000); // Auto-save after 2 seconds
  }, [currentTableData, section?.id, onSectionUpdate, onContentChange, formatTableForContent]);
  
  // Template selection
  const applyTemplate = useCallback((template: any) => {
    if (!template) return;
    
    if (template.isVIP && !userVIPStatus) {
      Alert.alert(
        'VIP Feature',
        'This table size is available for VIP members only.',
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Upgrade to VIP', style: 'default' },
        ]
      );
      return;
    }
    
    // Create new table data based on template
    const newTableData: TableData = {
      template: template.id || '3x3',
      headers: Array.isArray(template.headers) ? [...template.headers] : ['Player', 'Rating', 'Price'],
      rows: Array.isArray(template.sampleData) 
        ? template.sampleData.map(row => Array.isArray(row) ? [...row] : ['', '', ''])
        : [['', '', ''], ['', '', ''], ['', '', '']],
      styling: currentTableData?.styling || defaultStyling, // Keep current styling
    };
    
    setCurrentTableData(newTableData);
    setShowTemplateSelector(false);
    setIsDirty(true);
    autoSave();
    
    Vibration.vibrate(50);
    
    secureLog('Table template applied', {
      templateId: template.id,
      rows: template.rows,
      cols: template.cols,
      isVIP: template.isVIP,
    });
  }, [userVIPStatus, currentTableData?.styling, autoSave]);
  
  // Cell editing
  const updateCell = useCallback((rowIndex: number, colIndex: number, value: string) => {
    // Validate cell content
    const validation = validatePostContent(value);
    if (!validation.isValid && value.trim() !== '') {
      setErrors(prev => ({
        ...prev,
        [`${rowIndex}-${colIndex}`]: validation.errors?.[0] || 'Invalid content'
      }));
      return;
    }
    
    // Clear error if valid
    setErrors(prev => {
      const newErrors = { ...prev };
      delete newErrors[`${rowIndex}-${colIndex}`];
      return newErrors;
    });
    
    // Update table data
    setCurrentTableData(prev => {
      if (!prev || !Array.isArray(prev.rows)) return prev;
      
      const newRows = [...prev.rows];
      if (newRows[rowIndex] && Array.isArray(newRows[rowIndex])) {
        newRows[rowIndex] = [...newRows[rowIndex]];
        newRows[rowIndex][colIndex] = value;
      }
      
      return {
        ...prev,
        rows: newRows,
      };
    });
    
    setIsDirty(true);
    autoSave();
  }, [autoSave]);
  
  // Header editing
  const updateHeader = useCallback((colIndex: number, value: string) => {
    setCurrentTableData(prev => {
      if (!prev || !Array.isArray(prev.headers)) return prev;
      
      const newHeaders = [...prev.headers];
      newHeaders[colIndex] = value;
      
      return {
        ...prev,
        headers: newHeaders,
      };
    });
    
    setIsDirty(true);
    autoSave();
  }, [autoSave]);
  
  // Theme update
  const updateTheme = useCallback((theme: string) => {
    setCurrentTableData(prev => {
      if (!prev) return prev;
      
      return {
        ...prev,
        styling: {
          theme: theme as any,
          showBorders: prev.styling?.showBorders ?? true,
          alternateRows: prev.styling?.alternateRows ?? true,
          headerStyle: prev.styling?.headerStyle ?? 'bold',
        },
      };
    });
    
    setShowThemeSelector(false);
    setIsDirty(true);
    autoSave();
    Vibration.vibrate(30);
  }, [autoSave]);
  
  // Styling toggles
  const toggleStyling = useCallback((key: 'showBorders' | 'alternateRows') => {
    setCurrentTableData(prev => {
      if (!prev || !prev.styling) return prev;
      
      return {
        ...prev,
        styling: {
          ...prev.styling,
          [key]: !prev.styling[key],
        },
      };
    });
    
    setIsDirty(true);
    autoSave();
    Vibration.vibrate(30);
  }, [autoSave]);
  
  // Animation for preview updates
  const animatePreview = useCallback(() => {
    Animated.sequence([
      Animated.timing(previewAnimation, {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(previewAnimation, {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();
  }, [previewAnimation]);
  
  // Trigger preview animation when table changes
  useEffect(() => {
    animatePreview();
  }, [currentTableData, animatePreview]);
  
  // Cleanup
  useEffect(() => {
    return () => {
      if (autoSaveTimer.current) {
        clearTimeout(autoSaveTimer.current);
      }
    };
  }, []);
  
  // Check if table has content
  const hasContent = useMemo(() => {
    if (!currentTableData?.rows || !Array.isArray(currentTableData.rows)) return false;
    
    return currentTableData.rows.some(row => 
      Array.isArray(row) && row.some(cell => typeof cell === 'string' && cell.trim().length > 0)
    );
  }, [currentTableData?.rows]);
  
  // Calculate filled cells
  const filledCells = useMemo(() => {
    if (!currentTableData?.rows || !currentTableData?.headers) {
      return { filled: 0, total: 1 };
    }
    
    const total = currentTableData.rows.length * currentTableData.headers.length;
    const filled = currentTableData.rows.reduce((acc, row) => {
      if (!Array.isArray(row)) return acc;
      return acc + row.filter(cell => typeof cell === 'string' && cell.trim().length > 0).length;
    }, 0);
    
    return { filled, total: Math.max(total, 1) };
  }, [currentTableData?.rows, currentTableData?.headers]);
  
  // Safe access to current table data properties
  const safeCurrentTableData = currentTableData || defaultTableData;
  const safeHeaders = Array.isArray(safeCurrentTableData.headers) ? safeCurrentTableData.headers : ['Player', 'Rating', 'Price'];
  const safeRows = Array.isArray(safeCurrentTableData.rows) ? safeCurrentTableData.rows : [['', '', ''], ['', '', ''], ['', '', '']];
  const safeStyling = safeCurrentTableData.styling || defaultStyling;
  
  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [{ scale: slideAnimation }],
          opacity: slideAnimation,
        },
      ]}
    >
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Ionicons name="grid" size={20} color="#9370DB" />
          <Text style={styles.headerTitle}>Data Table</Text>
          <Text style={styles.templateInfo}>({currentTemplate.name})</Text>
          {isDirty && (
            <View style={styles.savingIndicator}>
              <Text style={styles.savingText}>Saving...</Text>
            </View>
          )}
        </View>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowTemplateSelector(true)}
          >
            <Ionicons name="grid-outline" size={18} color="#9370DB" />
          </TouchableOpacity>
          
          <TouchableOpacity
            style={styles.quickAction}
            onPress={() => setShowThemeSelector(true)}
          >
            <Ionicons name="color-palette" size={18} color="#32CD32" />
          </TouchableOpacity>
        </View>
      </View>
      
      {/* Table Stats */}
      <View style={styles.statsContainer}>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Size:</Text>
          <Text style={styles.statValue}>
            {safeRows.length} × {safeHeaders.length}
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Progress:</Text>
          <Text style={styles.statValue}>
            {filledCells.filled}/{filledCells.total} cells
          </Text>
        </View>
        <View style={styles.statItem}>
          <Text style={styles.statLabel}>Theme:</Text>
          <Text style={[styles.statValue, { color: currentTheme.textColor }]}>
            {currentTheme.name}
          </Text>
        </View>
      </View>
      
      {/* Styling Options */}
      <View style={styles.stylingContainer}>
        <TouchableOpacity
          style={[styles.stylingOption, safeStyling.showBorders && styles.stylingOptionActive]}
          onPress={() => toggleStyling('showBorders')}
        >
          <Ionicons
            name={safeStyling.showBorders ? "checkbox" : "square-outline"}
            size={16}
            color={safeStyling.showBorders ? "#32CD32" : "#888"}
          />
          <Text style={styles.stylingText}>Borders</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.stylingOption, safeStyling.alternateRows && styles.stylingOptionActive]}
          onPress={() => toggleStyling('alternateRows')}
        >
          <Ionicons
            name={safeStyling.alternateRows ? "checkbox" : "square-outline"}
            size={16}
            color={safeStyling.alternateRows ? "#32CD32" : "#888"}
          />
          <Text style={styles.stylingText}>Alternate Rows</Text>
        </TouchableOpacity>
      </View>
      
      {/* Table Editor */}
      <Animated.View
        style={[
          styles.tableContainer,
          {
            transform: [{ scale: previewAnimation }],
          },
        ]}
      >
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          style={styles.tableScroll}
        >
          <View style={styles.table}>
            {/* Headers */}
            <View style={styles.tableRow}>
              {safeHeaders.map((header, colIndex) => (
                <View
                  key={colIndex}
                  style={[
                    styles.tableCell,
                    styles.headerCell,
                    {
                      backgroundColor: currentTheme.headerBg,
                      borderColor: currentTheme.borderColor,
                      borderWidth: safeStyling.showBorders ? 1 : 0,
                    },
                  ]}
                >
                  <TextInput
                    style={[
                      styles.cellInput,
                      styles.headerInput,
                      { color: currentTheme.headerText },
                    ]}
                    value={header || ''}
                    onChangeText={(value) => updateHeader(colIndex, value)}
                    placeholder={`Column ${colIndex + 1}`}
                    placeholderTextColor={`${currentTheme.headerText}88`}
                    editable={!disabled}
                    maxLength={20}
                  />
                </View>
              ))}
            </View>
            
            {/* Data Rows */}
            {safeRows.map((row, rowIndex) => {
              const safeRow = Array.isArray(row) ? row : [];
              return (
                <View key={rowIndex} style={styles.tableRow}>
                  {safeRow.map((cell, colIndex) => (
                    <View
                      key={colIndex}
                      style={[
                        styles.tableCell,
                        {
                          backgroundColor: safeStyling.alternateRows && rowIndex % 2 === 1
                            ? currentTheme.altRowBg
                            : currentTheme.rowBg,
                          borderColor: currentTheme.borderColor,
                          borderWidth: safeStyling.showBorders ? 1 : 0,
                        },
                        editingCell?.row === rowIndex && editingCell?.col === colIndex && styles.editingCell,
                        errors[`${rowIndex}-${colIndex}`] && styles.errorCell,
                      ]}
                    >
                      <TextInput
                        style={[
                          styles.cellInput,
                          { color: currentTheme.textColor },
                        ]}
                        value={cell || ''}
                        onChangeText={(value) => updateCell(rowIndex, colIndex, value)}
                        onFocus={() => setEditingCell({ row: rowIndex, col: colIndex })}
                        onBlur={() => setEditingCell(null)}
                        placeholder={`R${rowIndex + 1}C${colIndex + 1}`}
                        placeholderTextColor={`${currentTheme.textColor}88`}
                        editable={!disabled}
                        maxLength={50}
                        multiline
                      />
                    </View>
                  ))}
                </View>
              );
            })}
          </View>
        </ScrollView>
      </Animated.View>
      
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              {
                width: `${(filledCells.filled / filledCells.total) * 100}%`,
                backgroundColor: filledCells.filled === filledCells.total ? '#32CD32' : '#00FFFF',
              },
            ]}
          />
        </View>
        <Text style={styles.progressText}>
          {Math.round((filledCells.filled / filledCells.total) * 100)}% Complete
        </Text>
      </View>
      
      {/* Template Selector Modal */}
      <Modal
        visible={showTemplateSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowTemplateSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.templateModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.templateContent}
            >
              <View style={styles.templateHeader}>
                <Text style={styles.templateTitle}>Choose Table Size</Text>
                <TouchableOpacity onPress={() => setShowTemplateSelector(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.templateList}>
                {['basic', 'detailed', 'advanced'].map(category => (
                  <View key={category} style={styles.templateCategory}>
                    <Text style={styles.categoryTitle}>
                      {category.charAt(0).toUpperCase() + category.slice(1)}
                      {category === 'advanced' && ' (VIP)'}
                    </Text>
                    
                    <View style={styles.templateGrid}>
                      {TABLE_TEMPLATES
                        .filter(template => template.category === category)
                        .map(template => (
                          <TouchableOpacity
                            key={template.id}
                            style={[
                              styles.templateItem,
                              template.isVIP && !userVIPStatus && styles.templateItemLocked,
                              safeCurrentTableData.template === template.id && styles.templateItemActive,
                            ]}
                            onPress={() => applyTemplate(template)}
                            disabled={template.isVIP && !userVIPStatus}
                          >
                            <LinearGradient
                              colors={
                                template.isVIP && !userVIPStatus
                                  ? ['rgba(255, 215, 0, 0.1)', 'transparent']
                                  : safeCurrentTableData.template === template.id
                                  ? ['rgba(147, 112, 219, 0.3)', 'rgba(147, 112, 219, 0.1)']
                                  : ['rgba(0, 255, 255, 0.1)', 'transparent']
                              }
                              style={styles.templateItemGradient}
                            >
                              <View style={styles.templateSize}>
                                <Text style={styles.templateSizeText}>{template.id}</Text>
                                {template.isVIP && !userVIPStatus && (
                                  <Ionicons name="crown" size={14} color="#FFD700" />
                                )}
                              </View>
                              <Text style={styles.templateName}>{template.name}</Text>
                              <Text style={styles.templateDescription}>{template.description}</Text>
                            </LinearGradient>
                          </TouchableOpacity>
                        ))}
                    </View>
                  </View>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
      
      {/* Theme Selector Modal */}
      <Modal
        visible={showThemeSelector}
        transparent
        animationType="fade"
        onRequestClose={() => setShowThemeSelector(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.themeModal}>
            <LinearGradient
              colors={['rgba(18, 25, 40, 0.95)', 'rgba(10, 15, 25, 0.9)']}
              style={styles.themeContent}
            >
              <View style={styles.themeHeader}>
                <Text style={styles.themeTitle}>Choose Theme</Text>
                <TouchableOpacity onPress={() => setShowThemeSelector(false)}>
                  <Ionicons name="close" size={24} color="#888" />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.themeList}>
                {Object.entries(TABLE_THEMES).map(([themeKey, theme]) => (
                  <TouchableOpacity
                    key={themeKey}
                    style={[
                      styles.themeItem,
                      safeStyling.theme === themeKey && styles.themeItemActive,
                    ]}
                    onPress={() => updateTheme(themeKey)}
                  >
                    <LinearGradient
                      colors={
                        safeStyling.theme === themeKey
                          ? ['rgba(50, 205, 50, 0.2)', 'rgba(50, 205, 50, 0.1)']
                          : ['rgba(255, 255, 255, 0.05)', 'transparent']
                      }
                      style={styles.themeItemGradient}
                    >
                      <View style={styles.themePreview}>
                        <View style={[styles.themeColorBar, { backgroundColor: theme.headerBg }]} />
                        <View style={[styles.themeColorBar, { backgroundColor: theme.borderColor }]} />
                        <View style={[styles.themeColorBar, { backgroundColor: theme.textColor }]} />
                      </View>
                      <Text style={styles.themeName}>{theme.name}</Text>
                    </LinearGradient>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </LinearGradient>
          </View>
        </View>
      </Modal>
    </Animated.View>
  );
};

export default TableSectionEditor;

/* ----------------- REVOLUTIONARY TABLE EDITOR STYLES ----------------- */
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  
  // Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(147, 112, 219, 0.2)',
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerTitle: {
    color: '#9370DB',
    fontSize: 18,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  templateInfo: {
    color: '#888',
    fontSize: 12,
    marginLeft: 8,
    fontStyle: 'italic',
  },
  savingIndicator: {
    marginLeft: 12,
    backgroundColor: 'rgba(32, 205, 50, 0.2)',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  savingText: {
    color: '#32CD32',
    fontSize: 11,
    fontWeight: '500',
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  quickAction: {
    backgroundColor: 'rgba(147, 112, 219, 0.1)',
    padding: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.3)',
  },
  
  // Stats
  statsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
  },
  statItem: {
    alignItems: 'center',
  },
  statLabel: {
    color: '#888',
    fontSize: 11,
    marginBottom: 2,
  },
  statValue: {
    color: '#FFFFFF',
    fontSize: 13,
    fontWeight: 'bold',
  },
  
  // Styling Options
  stylingContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 16,
    gap: 12,
  },
  stylingOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.05)',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
    flex: 1,
    justifyContent: 'center',
    gap: 6,
  },
  stylingOptionActive: {
    borderColor: '#32CD32',
    backgroundColor: 'rgba(50, 205, 50, 0.1)',
  },
  stylingText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Table
  tableContainer: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    borderRadius: 12,
    overflow: 'hidden',
    marginBottom: 16,
  },
  tableScroll: {
    flex: 1,
  },
  table: {
    minWidth: SCREEN_WIDTH - 64, // Account for padding
  },
  tableRow: {
    flexDirection: 'row',
  },
  tableCell: {
    flex: 1,
    minWidth: 80,
    minHeight: 40,
    justifyContent: 'center',
  },
  headerCell: {
    minHeight: 50,
  },
  editingCell: {
    borderColor: '#00FFFF',
    borderWidth: 2,
  },
  errorCell: {
    borderColor: '#FF6347',
    borderWidth: 2,
  },
  cellInput: {
    color: '#FFFFFF',
    fontSize: 12,
    textAlign: 'center',
    paddingHorizontal: 4,
    paddingVertical: 8,
    minHeight: 40,
  },
  headerInput: {
    fontWeight: 'bold',
    fontSize: 13,
  },
  
  // Progress
  progressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: 'rgba(255, 255, 255, 0.1)',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 3,
  },
  progressText: {
    color: '#888',
    fontSize: 12,
    fontWeight: '500',
  },
  
  // Modals
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  
  // Template Modal
  templateModal: {
    width: SCREEN_WIDTH * 0.9,
    maxHeight: '80%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  templateContent: {
    maxHeight: '100%',
  },
  templateHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(147, 112, 219, 0.2)',
  },
  templateTitle: {
    color: '#9370DB',
    fontSize: 18,
    fontWeight: 'bold',
  },
  templateList: {
    maxHeight: 500,
    padding: 16,
  },
  templateCategory: {
    marginBottom: 20,
  },
  categoryTitle: {
    color: '#FFD700',
    fontSize: 16,
    fontWeight: 'bold',
    marginBottom: 12,
  },
  templateGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  templateItem: {
    width: (SCREEN_WIDTH * 0.9 - 48) / 3, // 3 columns
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(147, 112, 219, 0.2)',
  },
  templateItemLocked: {
    borderColor: 'rgba(255, 215, 0, 0.3)',
    opacity: 0.7,
  },
  templateItemActive: {
    borderColor: '#9370DB',
  },
  templateItemGradient: {
    padding: 12,
    alignItems: 'center',
  },
  templateSize: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginBottom: 4,
  },
  templateSizeText: {
    color: '#9370DB',
    fontSize: 14,
    fontWeight: 'bold',
  },
  templateName: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 4,
  },
  templateDescription: {
    color: '#888',
    fontSize: 10,
    textAlign: 'center',
    lineHeight: 14,
  },
  
  // Theme Modal
  themeModal: {
    width: SCREEN_WIDTH * 0.8,
    maxHeight: '60%',
    borderRadius: 16,
    overflow: 'hidden',
  },
  themeContent: {
    maxHeight: '100%',
  },
  themeHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: 'rgba(50, 205, 50, 0.2)',
  },
  themeTitle: {
    color: '#32CD32',
    fontSize: 18,
    fontWeight: 'bold',
  },
  themeList: {
    maxHeight: 300,
    padding: 16,
  },
  themeItem: {
    marginBottom: 12,
    borderRadius: 12,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.1)',
  },
  themeItemActive: {
    borderColor: '#32CD32',
  },
  themeItemGradient: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    gap: 16,
  },
  themePreview: {
    flexDirection: 'row',
    gap: 4,
  },
  themeColorBar: {
    width: 12,
    height: 20,
    borderRadius: 2,
  },
  themeName: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});