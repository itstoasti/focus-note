import { useEffect, useState, useRef, useCallback } from 'react';
import { 
  StyleSheet, 
  Text, 
  View, 
  TextInput, 
  FlatList, 
  Pressable, 
  Modal, 
  TouchableOpacity,
  Alert,
  Keyboard,
  TouchableWithoutFeedback,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Storage, Note } from '../../types/storage';
import { getStorageData, setStorageData, checkAndUpdateBadges } from '../../utils/storage';
import { useTheme } from '../../context/ThemeContext';
import { useFocusEffect } from 'expo-router';

// Parse text with markdown-style formatting
const parseFormattedText = (text: string) => {
  if (!text) return [];

  // Split text by formatting markers
  const boldRegex = /\*\*(.*?)\*\*/g;
  const italicRegex = /\*(.*?)\*/g;
  const underlineRegex = /_(.*?)_/g;

  let elements: { text: string; styles: any[] }[] = [{ text, styles: [] }];

  // Process bold formatting
  elements = processFormatting(elements, boldRegex, { fontWeight: 'bold' });
  
  // Process italic formatting
  elements = processFormatting(elements, italicRegex, { fontStyle: 'italic' });
  
  // Process underline formatting
  elements = processFormatting(elements, underlineRegex, { textDecorationLine: 'underline' });

  return elements;
};

// Helper function to process text with formatting
const processFormatting = (
  elements: { text: string; styles: any[] }[],
  regex: RegExp,
  style: any
) => {
  const result: { text: string; styles: any[] }[] = [];

  elements.forEach(element => {
    const { text, styles } = element;
    if (styles.includes(style)) {
      // Already has this style, skip processing
      result.push(element);
      return;
    }

    let lastIndex = 0;
    const matches = [...text.matchAll(regex)];

    if (matches.length === 0) {
      // No matches, keep element as is
      result.push(element);
      return;
    }

    matches.forEach(match => {
      const [fullMatch, content] = match;
      const startIndex = match.index || 0;
      const endIndex = startIndex + fullMatch.length;

      // Add text before the match
      if (startIndex > lastIndex) {
        result.push({
          text: text.substring(lastIndex, startIndex),
          styles: [...styles],
        });
      }

      // Add the matched text with the style applied
      result.push({
        text: content,
        styles: [...styles, style],
      });

      lastIndex = endIndex;
    });

    // Add any remaining text after the last match
    if (lastIndex < text.length) {
      result.push({
        text: text.substring(lastIndex),
        styles: [...styles],
      });
    }
  });

  return result;
};

// Component to render formatted text
const FormattedText = ({ content, baseStyle }: { content: string; baseStyle: any }) => {
  console.log('[FormattedText] Content type:', typeof content);
  console.log('[FormattedText] Content received:', content ? content.substring(0, 100) + '...' : 'empty');
  
  if (!content) {
    console.log('[FormattedText] No content provided');
    return <Text style={baseStyle}>No content</Text>;
  }
  
  try {
    // Try to parse the content as JSON
    const parsedContent = JSON.parse(content);
    console.log('[FormattedText] Successfully parsed JSON');
    
    if (parsedContent.text && parsedContent.formatting) {
      console.log('[FormattedText] Found text and formatting in parsed content');
      // Create an array of characters with their formatting
      const formattedChars = parsedContent.text.split('').map((char: string, index: number) => {
        let charStyle = {};
        
        // Check if this character is within any formatted section
        parsedContent.formatting.forEach((section: any) => {
          if (index >= section.start && index < section.end) {
            if (section.styles.bold) charStyle = { ...charStyle, fontWeight: 'bold' };
            if (section.styles.italic) charStyle = { ...charStyle, fontStyle: 'italic' };
            if (section.styles.underline) charStyle = { ...charStyle, textDecorationLine: 'underline' };
            else if ('underline' in section.styles) charStyle = { ...charStyle, textDecorationLine: 'none' };
          }
        });
        
        return {
          char,
          style: charStyle
        };
      });
      
      return (
        <Text style={baseStyle}>
          {formattedChars.map((item, index) => (
            <Text key={index} style={item.style}>
              {item.char}
            </Text>
          ))}
        </Text>
      );
    } else {
      console.log('[FormattedText] Parsed content missing text or formatting');
    }
  } catch (e) {
    // Fall back to the original markdown parsing if JSON parsing fails
    console.log('[FormattedText] JSON parsing failed, falling back to markdown parsing');
    const elements = parseFormattedText(content);
    
    return (
      <Text style={baseStyle}>
        {elements.map((element, index) => (
          <Text key={index} style={element.styles}>
            {element.text}
          </Text>
        ))}
      </Text>
    );
  }
  
  // If all else fails, just render the plain text
  console.log('[FormattedText] Falling back to plain text rendering');
  return <Text style={baseStyle}>{content}</Text>;
};

// Component to render text with formatting over a TextInput
const FormattedTextOverlay = ({ content, formattedSections, style }: { 
  content: string; 
  formattedSections: Array<{
    start: number;
    end: number;
    styles: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
  }>;
  style: any;
}) => {
  if (!content) return null;
  
  // Create an array of characters with their formatting
  const formattedChars = content.split('').map((char, index) => {
    let charStyle = {};
    
    // Check if this character is within any formatted section
    formattedSections.forEach(section => {
      if (index >= section.start && index < section.end) {
        if (section.styles.bold) charStyle = { ...charStyle, fontWeight: 'bold' };
        if (section.styles.italic) charStyle = { ...charStyle, fontStyle: 'italic' };
        if (section.styles.underline) charStyle = { ...charStyle, textDecorationLine: 'underline' };
        else if ('underline' in section.styles) charStyle = { ...charStyle, textDecorationLine: 'none' };
      }
    });
    
    return {
      char,
      style: charStyle
    };
  });
  
  return (
    <View style={[styles.formattedTextOverlay, style]}>
      <Text style={{ color: style.color }}>
        {formattedChars.map((item, index) => (
          <Text key={index} style={item.style}>
            {item.char === ' ' ? '\u00A0' : item.char}
          </Text>
        ))}
      </Text>
    </View>
  );
};

// Function to get properly formatted content for display
const getDisplayContent = (content: string | undefined): string => {
  if (!content) return '';
  
  try {
    // If it's already in JSON format, just return it
    JSON.parse(content);
    return content;
  } catch (e) {
    // If it's not JSON, convert to the expected format
    return JSON.stringify({
      text: content,
      formatting: []
    });
  }
};

export default function NotesScreen() {
  const [storage, setStorage] = useState<Storage | null>(null);
  const [notes, setNotes] = useState<Note[]>([]);
  const [newNoteTitle, setNewNoteTitle] = useState('');
  const [newNoteContent, setNewNoteContent] = useState('');
  const [isAddModalVisible, setIsAddModalVisible] = useState(false);
  const [isEditModalVisible, setIsEditModalVisible] = useState(false);
  const [isReadOnlyModalVisible, setIsReadOnlyModalVisible] = useState(false);
  const [currentNote, setCurrentNote] = useState<Note | null>(null);
  const [editedContent, setEditedContent] = useState('');
  const [selectionVisible, setSelectionVisible] = useState(false);
  const [selection, setSelection] = useState({ start: 0, end: 0 });
  const [searchQuery, setSearchQuery] = useState('');
  const [formattedSections, setFormattedSections] = useState<Array<{
    start: number;
    end: number;
    styles: {
      bold?: boolean;
      italic?: boolean;
      underline?: boolean;
    };
  }>>([]);
  const [activeFormats, setActiveFormats] = useState({
    bold: false,
    italic: false,
    underline: false
  });
  const { isDark } = useTheme();
  
  // References
  const titleInputRef = useRef<TextInput>(null);
  const contentInputRef = useRef<TextInput>(null);
  
  // Initial data load
  useEffect(() => {
    loadData();
  }, []);
  
  // Reload data when the screen comes into focus
  useFocusEffect(
    useCallback(() => {
      console.log('[Notes] Tab focused, reloading data');
      loadData();
      return () => {}; // cleanup function
    }, [])
  );
  
  async function loadData() {
    console.log('[Notes] Loading data');
    try {
      const data = await getStorageData();
      console.log(`[Notes] Successfully retrieved storage data with ${data.notes?.length || 0} notes`);
      
      // Ensure we have a badges array
      if (!data.stats.badges || !Array.isArray(data.stats.badges)) {
        console.log('[Notes] Badges array missing, initializing');
        data.stats.badges = [];
      }
      
      // Ensure we have notes array
      if (!data.notes || !Array.isArray(data.notes)) {
        console.log('[Notes] Notes array missing, initializing');
        data.notes = [];
      }
      
      setStorage(data);
      setNotes(data.notes || []);
      console.log(`[Notes] Data loaded successfully with ${data.notes?.length || 0} notes`);
    } catch (error) {
      console.error('[Notes] Error loading data:', error);
      
      // If there's an error, initialize with empty storage
      const emptyStorage = {
        tasks: [],
        stats: {
          streak: 0,
          freezeTokens: 0,
          xp: 0,
          pomodoroXp: 0,
          totalPomodoros: 0,
          level: 1,
          lastEndDay: null,
          badges: [],
          tasksCompleted: 0,
          hardTasksCompleted: 0,
          notesCreated: 0,
          dailyTasksCompleted: 0,
          dailyPomodorosCompleted: 0,
          calendarTasksCreated: 0,
          saturdayCompleted: false,
          sundayCompleted: false,
        },
        notes: [],
      };
      
      setStorage(emptyStorage);
      setNotes([]);
      console.log('[Notes] Initialized with empty storage due to error');
    }
  }
  
  // Filter notes based on search query
  const filteredNotes = searchQuery
    ? storage?.notes.filter(
        note => 
          note.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
          note.content.toLowerCase().includes(searchQuery.toLowerCase())
      ) || []
    : storage?.notes || [];
  
  // Sort notes by most recently updated
  const sortedNotes = [...filteredNotes].sort((a, b) => 
    new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()
  );
  
  const handleAddNote = async () => {
    try {
      if (!storage) {
        console.log('[Notes] Storage is null, initializing empty storage');
        // Initialize with default empty storage
        const emptyStorage = {
          tasks: [],
          stats: {
            streak: 0,
            freezeTokens: 0,
            xp: 0,
            pomodoroXp: 0,
            totalPomodoros: 0,
            level: 1,
            lastEndDay: null,
            badges: [],
            tasksCompleted: 0,
            hardTasksCompleted: 0,
            notesCreated: 1, // Start with 1 for this note
            dailyTasksCompleted: 0,
            dailyPomodorosCompleted: 0,
            calendarTasksCreated: 0,
            saturdayCompleted: false,
            sundayCompleted: false,
          },
          notes: [],
        };
        setStorage(emptyStorage);
        
        // Reload the full storage to ensure we have proper badge data
        loadData();
        
        // Show error to the user
        Alert.alert('Storage Error', 'Your storage was empty or corrupted. It has been reset.');
        return; // Return here and let them try again after storage is initialized
      }
      
      if (!newNoteTitle.trim()) {
        Alert.alert('Error', 'Please enter a title for your note');
        return;
      }
      
      const now = new Date().toISOString();
      const newNote: Note = {
        id: Date.now().toString(),
        title: newNoteTitle.trim(),
        content: prepareContentForStorage(newNoteContent),
        createdAt: now,
        updatedAt: now,
      };
      
      // Update the notes created counter
      const notesCreated = storage.stats.notesCreated + 1;
      
      // Prepare updated stats
      const updatedStats = await checkAndUpdateBadges({
        ...storage.stats,
        notesCreated,
      });
      
      const newStorage = {
        ...storage,
        notes: [...storage.notes, newNote],
        stats: updatedStats,
      };
      
      await setStorageData(newStorage);
      setStorage(newStorage);
      setNewNoteTitle('');
      setNewNoteContent('');
      setIsAddModalVisible(false);
    } catch (error) {
      console.error('Error saving note:', error);
      Alert.alert('Error', 'Failed to save note. Please try again.');
    }
  };
  
  const handleUpdateNote = async () => {
    if (!storage || !currentNote) return;
    if (!newNoteTitle.trim()) {
      Alert.alert('Error', 'Please enter a title for your note');
      return;
    }
    
    const updatedNotes = storage.notes.map(note => 
      note.id === currentNote.id 
        ? {
            ...note,
            title: newNoteTitle.trim(),
            content: prepareContentForStorage(editedContent),
            updatedAt: new Date().toISOString(),
          }
        : note
    );
    
    const newStorage = {
      ...storage,
      notes: updatedNotes,
    };
    
    await setStorageData(newStorage);
    setStorage(newStorage);
    setCurrentNote(null);
    setNewNoteTitle('');
    setEditedContent('');
    setIsEditModalVisible(false);
  };
  
  const handleDeleteNote = async (id: string) => {
    if (!storage) return;
    
    Alert.alert(
      'Delete Note',
      'Are you sure you want to delete this note?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            const newNotes = storage.notes.filter(note => note.id !== id);
            
            const newStorage = {
              ...storage,
              notes: newNotes,
            };
            
            await setStorageData(newStorage);
            setStorage(newStorage);
            
            if (isEditModalVisible && currentNote?.id === id) {
              setIsEditModalVisible(false);
              setCurrentNote(null);
            }
          },
        },
      ]
    );
  };
  
  // Apply formatting to selected text
  const applyFormatting = (type: string) => {
    // If no text is selected, just toggle the active format for future typing
    if (selection.start === selection.end) {
      setActiveFormats(prev => ({ ...prev, [type]: !prev[type] }));
      return;
    }
    
    // Text is selected, apply formatting to the selected section
    // Create a copy of current formatted sections
    const newFormattedSections = [...formattedSections];
    
    const selStart = Math.min(selection.start, selection.end);
    const selEnd = Math.max(selection.start, selection.end);
    
    // Check if selected text already has this formatting exactly (same range)
    const exactSectionIndex = newFormattedSections.findIndex(section => 
      section.start === selStart && section.end === selEnd && section.styles[type]
    );
    
    // If exact section exists, remove the formatting
    if (exactSectionIndex >= 0) {
      const updatedSection = { ...newFormattedSections[exactSectionIndex] };
      const { [type]: _, ...remainingStyles } = updatedSection.styles;
      
      // If no styles remain, remove the section
      if (Object.keys(remainingStyles).length === 0) {
        newFormattedSections.splice(exactSectionIndex, 1);
      } else {
        updatedSection.styles = remainingStyles;
        newFormattedSections[exactSectionIndex] = updatedSection;
      }
    } else {
      // Add new formatted section
      newFormattedSections.push({
        start: selStart,
        end: selEnd,
        styles: { [type]: true }
      });
    }
    
    setFormattedSections(newFormattedSections);
    
    // Update active formats to indicate the button state
    setActiveFormats(prev => {
      // Find if any part of the current selection has this formatting
      const hasFormatting = formattedSections.some(section => 
        ((section.start < selEnd && section.end > selStart) || 
        (section.start >= selStart && section.start < selEnd) || 
        (section.end > selStart && section.end <= selEnd)) && 
        section.styles[type]
      );
      
      return { ...prev, [type]: !hasFormatting };
    });
    
    // Keep focus on the content input
    contentInputRef.current?.focus();
  };
  
  // Toggle formatting button
  const toggleFormatting = (type: string) => {
    if (type === 'bullet' || type === 'checkbox') {
      // These are not selection-based formatting
      switch(type) {
        case 'bullet':
          setNewNoteContent(newNoteContent + '\n• ');
          break;
        case 'checkbox':
          setNewNoteContent(newNoteContent + '\n[ ] ');
          break;
      }
    } else {
      // Apply formatting to selected text
      applyFormatting(type);
    }
    
    contentInputRef.current?.focus();
  };

  // Handle selection change in the text input
  const handleSelectionChange = (event: any) => {
    const { start, end } = event.nativeEvent.selection;
    setSelection({ start, end });
    
    // Update active formats based on the current selection
    updateActiveFormatsForSelection({ start, end });
  };
  
  // Update active formats based on text selection
  const updateActiveFormatsForSelection = (currentSelection: { start: number; end: number }) => {
    // Only update active formats if text is selected
    // Don't change active formats when cursor is just moved
    if (currentSelection.start !== currentSelection.end) {
      // Find if current selection is within any formatted section
      const overlappingSections = formattedSections.filter(section => 
        (currentSelection.start >= section.start && currentSelection.start < section.end) ||
        (currentSelection.end > section.start && currentSelection.end <= section.end) ||
        (currentSelection.start <= section.start && currentSelection.end >= section.end)
      );
      
      if (overlappingSections.length === 0) {
        // No overlapping sections, reset active formats
        setActiveFormats({
          bold: false,
          italic: false,
          underline: false
        });
        return;
      }
      
      // Get combined styles from all overlapping sections
      const newActiveFormats = {
        bold: false,
        italic: false,
        underline: false
      };
      
      overlappingSections.forEach(section => {
        if (section.styles.bold) newActiveFormats.bold = true;
        if (section.styles.italic) newActiveFormats.italic = true;
        if (section.styles.underline) newActiveFormats.underline = true;
      });
      
      setActiveFormats(newActiveFormats);
    }
  };
  
  // Check if a position in the text has specific formatting
  const hasFormatAtPosition = (position: number, formatType: string): boolean => {
    for (const section of formattedSections) {
      if (position >= section.start && position < section.end) {
        return section.styles[formatType as keyof typeof section.styles] || false;
      }
    }
    return false;
  };
  
  // Get styles for specific character
  const getStyleForCharacter = (index: number) => {
    const characterStyles: any = {
      // Default styles to ensure safe rendering
      textDecorationLine: 'none'
    };
    
    formattedSections.forEach(section => {
      if (index >= section.start && index < section.end) {
        if (section.styles.bold) characterStyles.fontWeight = 'bold';
        if (section.styles.italic) characterStyles.fontStyle = 'italic';
        if (section.styles.underline) characterStyles.textDecorationLine = 'underline';
      }
    });
    
    return characterStyles;
  };

  // Convert stored content with markdown to formatted content
  const parseStoredContent = (content: string) => {
    if (!content) return '';
    
    // Convert markdown syntax to plain text for display
    let parsedContent = content;
    parsedContent = parsedContent.replace(/\*\*(.*?)\*\*/g, '$1'); // Remove bold markers
    parsedContent = parsedContent.replace(/\*(.*?)\*/g, '$1');     // Remove italic markers
    parsedContent = parsedContent.replace(/_(.*?)_/g, '$1');       // Remove underline markers
    
    return parsedContent;
  };
  
  // Convert formatted content back to markdown for storage
  const prepareContentForStorage = (content: string) => {
    // Preserve formatting information with the content
    const formattedContent = {
      text: content,
      formatting: formattedSections
    };
    
    return JSON.stringify(formattedContent);
  };
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };
  
  const getExcerpt = (content: string, maxLength = 100) => {
    if (!content) return '';
    
    try {
      // Try to parse as JSON with formatting
      const parsedContent = JSON.parse(content);
      if (parsedContent.text) {
        if (parsedContent.text.length <= maxLength) {
          return content; // Return the original JSON to keep formatting
        }
        // Create truncated version
        return JSON.stringify({
          text: parsedContent.text.substring(0, maxLength) + '...',
          formatting: parsedContent.formatting.filter(
            (section: any) => section.start < maxLength
          ).map((section: any) => ({
            ...section,
            end: Math.min(section.end, maxLength)
          }))
        });
      }
    } catch (e) {
      // Not JSON, treat as plain text
    }
    
    // Handle plain text
    if (content.length <= maxLength) return content;
    return content.substring(0, maxLength) + '...';
  };
  
  const openReadOnlyView = (note: Note) => {
    console.log('[Notes] Opening read-only view for note:', note.id, note.title);
    
    // Parse the content if needed
    let processedContent = note.content;
    try {
      // Test if the content is valid JSON
      JSON.parse(note.content);
      console.log('[Notes] Content already in JSON format');
    } catch (e) {
      // If not, convert it to the expected format
      console.log('[Notes] Converting content to JSON format');
      processedContent = JSON.stringify({
        text: note.content,
        formatting: []
      });
    }
    
    // Make a clean copy of the note with processed content
    const noteCopy = {
      ...note,
      content: processedContent
    };
    
    setCurrentNote(noteCopy);
    setIsReadOnlyModalVisible(true);
  };
  
  const openEditModal = (note: Note) => {
    setCurrentNote(note);
    setNewNoteTitle(note.title);
    
    // Try to parse the content if it's in JSON format
    try {
      const parsedContent = JSON.parse(note.content);
      if (parsedContent.text && parsedContent.formatting) {
        setEditedContent(parsedContent.text);
        setFormattedSections(parsedContent.formatting);
      } else {
        // Fallback if content is not in expected format
        setEditedContent(parseStoredContent(note.content));
        setFormattedSections([]);
      }
    } catch (e) {
      // Fallback for plain text or old markdown format
      setEditedContent(parseStoredContent(note.content));
      setFormattedSections([]);
    }
    
    setActiveFormats({
      bold: false,
      italic: false,
      underline: false
    });
    
    // Close the read-only view if it's open
    setIsReadOnlyModalVisible(false);
    
    // Open the edit modal
    setIsEditModalVisible(true);
  };
  
  // Render formatted text
  const renderFormattedContent = () => {
    if (!editedContent) return null;
    
    return (
      <Text>
        {editedContent.split('').map((char, index) => {
          const style = getStyleForCharacter(index);
          return (
            <Text key={index} style={style}>
              {char}
            </Text>
          );
        })}
      </Text>
    );
  };
  
  if (!storage) return null;
  
  return (
    <SafeAreaView style={[styles.container, { backgroundColor: isDark ? '#000000' : '#F8FAFC' }]}>
      <View style={styles.header}>
        <Text style={[styles.title, { color: isDark ? '#FFFFFF' : '#000000' }]}>Notes</Text>
        <TouchableOpacity 
          style={[styles.addButton, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}
          onPress={() => {
            setNewNoteTitle('');
            setNewNoteContent('');
            setIsAddModalVisible(true);
            console.log('[Notes] Add modal opened');
          }}
        >
          <Text style={[styles.addButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>+</Text>
        </TouchableOpacity>
      </View>
      
      <View style={styles.searchContainer}>
        <TextInput
          style={[
            styles.searchInput, 
            { 
              backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
              color: isDark ? '#FFFFFF' : '#000000',
              borderColor: isDark ? '#333333' : '#E2E8F0',
            }
          ]}
          placeholder="Search notes..."
          placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
          value={searchQuery}
          onChangeText={setSearchQuery}
        />
      </View>
      
      {sortedNotes.length === 0 ? (
        <View style={styles.emptyState}>
          <Text style={[styles.emptyStateText, { color: isDark ? '#94A3B8' : '#64748B' }]}>
            {searchQuery ? 'No notes match your search' : 'No notes yet. Tap + to create one!'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={sortedNotes}
          keyExtractor={item => item.id}
          contentContainerStyle={styles.notesList}
          showsVerticalScrollIndicator={false}
          renderItem={({ item }) => (
            <TouchableOpacity 
              style={[
                styles.noteItem, 
                { 
                  backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF',
                  borderColor: isDark ? '#333333' : '#E2E8F0',
                }
              ]}
              onPress={() => openReadOnlyView(item)}
            >
              <View style={styles.noteHeader}>
                <Text style={[styles.noteTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  {item.title}
                </Text>
                <Text style={[styles.noteDate, { color: isDark ? '#666666' : '#94A3B8' }]}>
                  {formatDate(item.updatedAt)}
                </Text>
              </View>
              {/* Use FormattedText instead of plain Text */}
              <FormattedText 
                content={getExcerpt(item.content)}
                baseStyle={[styles.noteExcerpt, { color: isDark ? '#94A3B8' : '#64748B' }]}
              />
            </TouchableOpacity>
          )}
        />
      )}
      
      {/* Add Note Modal */}
      <Modal
        visible={isAddModalVisible}
        animationType="slide"
        transparent={true}
        onShow={() => setTimeout(() => titleInputRef.current?.focus(), 100)}
        onRequestClose={() => setIsAddModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View 
              style={[
                styles.modalContent, 
                { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  New Note
                </Text>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsAddModalVisible(false)}
                >
                  <Text style={[styles.closeButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
              
              <TextInput
                ref={titleInputRef}
                style={[
                  styles.titleInput, 
                  { 
                    borderColor: isDark ? '#333333' : '#E2E8F0',
                    color: isDark ? '#FFFFFF' : '#000000',
                  }
                ]}
                placeholder="Title"
                placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
                returnKeyType="next"
                onSubmitEditing={() => contentInputRef.current?.focus()}
              />
              
              {/* Formatting Toolbar */}
              <View style={[styles.formattingToolbar, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}>
                <TouchableOpacity 
                  style={[
                    styles.toolbarButton,
                    activeFormats.bold && { backgroundColor: isDark ? '#555555' : '#CBD5E1' }
                  ]} 
                  onPress={() => toggleFormatting('bold')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000', fontWeight: 'bold' }]}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toolbarButton,
                    activeFormats.italic && { backgroundColor: isDark ? '#555555' : '#CBD5E1' }
                  ]} 
                  onPress={() => toggleFormatting('italic')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000', fontStyle: 'italic' }]}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toolbarButton,
                    activeFormats.underline && { backgroundColor: isDark ? '#555555' : '#CBD5E1' }
                  ]} 
                  onPress={() => toggleFormatting('underline')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000', textDecorationLine: 'underline' }]}>U</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.toolbarButton} 
                  onPress={() => toggleFormatting('bullet')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>•</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.toolbarButton} 
                  onPress={() => toggleFormatting('checkbox')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>☐</Text>
                </TouchableOpacity>
              </View>
              
              {/* Render formatted text input for content */}
              <View 
                style={[
                  styles.contentInput, 
                  { 
                    backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9',
                    position: 'relative',
                  }
                ]}
              >
                <TextInput
                  ref={contentInputRef}
                  style={[
                    { 
                      color: 'transparent',
                      padding: 12,
                      fontSize: 16,
                      flex: 1,
                      height: 200,
                      textAlignVertical: 'top',
                    },
                    // Only apply global formatting when no text is selected
                    selection.start === selection.end && activeFormats.bold && { fontWeight: 'bold' },
                    selection.start === selection.end && activeFormats.italic && { fontStyle: 'italic' },
                    selection.start === selection.end && activeFormats.underline ? 
                      { textDecorationLine: 'underline' } : 
                      { textDecorationLine: 'none' }
                  ]}
                  placeholder="Write your note here..."
                  placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
                  value={newNoteContent}
                  onChangeText={(text) => {
                    // Get change information
                    const lengthDiff = text.length - newNoteContent.length;
                    
                    // Check if text was added (not deleted)
                    if (lengthDiff > 0 && selection.start === selection.end) {
                      // Text was added at cursor position
                      // Get the position where text was added
                      const insertPos = selection.start;
                      
                      // If any formatting is active, apply it to the newly added text
                      if (activeFormats.bold || activeFormats.italic || activeFormats.underline) {
                        // Calculate the end position of the inserted text
                        const endPos = insertPos + lengthDiff;
                        
                        // Create a new formatted section for the inserted text
                        const newFormattingSection = {
                          start: insertPos,
                          end: endPos,
                          styles: {
                            ...(activeFormats.bold && { bold: true }),
                            ...(activeFormats.italic && { italic: true }),
                            ...(activeFormats.underline && { underline: true })
                          }
                        };
                        
                        // Add the new section
                        const newSections = [...formattedSections, newFormattingSection];
                        
                        // Update existing sections that might be affected by the insert
                        const updatedSections = newSections.map(section => {
                          // If insertion point is before this section, shift it
                          if (insertPos <= section.start && section !== newFormattingSection) {
                            return {
                              ...section,
                              start: section.start + lengthDiff,
                              end: section.end + lengthDiff
                            };
                          }
                          // If insertion point is within this section, expand it
                          else if (insertPos > section.start && insertPos < section.end && section !== newFormattingSection) {
                            return {
                              ...section,
                              end: section.end + lengthDiff
                            };
                          }
                          return section;
                        });
                        
                        setFormattedSections(updatedSections);
                      } else {
                        // No formatting active, just update section positions
                        const updatedSections = formattedSections.map(section => {
                          // If insertion point is before this section, shift it
                          if (insertPos <= section.start) {
                            return {
                              ...section,
                              start: section.start + lengthDiff,
                              end: section.end + lengthDiff
                            };
                          }
                          // If insertion point is within this section, expand it
                          else if (insertPos > section.start && insertPos < section.end) {
                            return {
                              ...section,
                              end: section.end + lengthDiff
                            };
                          }
                          return section;
                        });
                        
                        setFormattedSections(updatedSections);
                      }
                    }
                    // Handle text deletion
                    else if (lengthDiff < 0) {
                      // Calculate deleted text range
                      const deleteStart = selection.start;
                      const deleteEnd = deleteStart - lengthDiff;
                      
                      // Update sections affected by deletion
                      const updatedSections = formattedSections
                        .map(section => {
                          // Section entirely after deletion - shift left
                          if (section.start >= deleteEnd) {
                            return {
                              ...section,
                              start: Math.max(0, section.start + lengthDiff),
                              end: Math.max(0, section.end + lengthDiff)
                            };
                          }
                          // Section entirely before deletion - keep as is
                          else if (section.end <= deleteStart) {
                            return section;
                          }
                          // Section overlaps with deletion - adjust boundaries
                          else {
                            // If deletion completely contains the section, remove it
                            if (deleteStart <= section.start && deleteEnd >= section.end) {
                              return null;
                            }
                            // If deletion is in the middle of the section, shrink it
                            else if (deleteStart > section.start && deleteEnd < section.end) {
                              return {
                                ...section,
                                end: section.end + lengthDiff
                              };
                            }
                            // If deletion removes the start of the section
                            else if (deleteStart <= section.start && deleteEnd < section.end) {
                              return {
                                ...section,
                                start: deleteStart,
                                end: section.end + lengthDiff
                              };
                            }
                            // If deletion removes the end of the section
                            else if (deleteStart > section.start && deleteEnd >= section.end) {
                              return {
                                ...section,
                                end: deleteStart
                              };
                            }
                          }
                          return section;
                        })
                        .filter(Boolean) as Array<{
                          start: number;
                          end: number;
                          styles: {
                            bold?: boolean;
                            italic?: boolean;
                            underline?: boolean;
                          };
                        }>;
                      
                      setFormattedSections(updatedSections);
                    }
                    
                    setNewNoteContent(text);
                  }}
                  multiline
                  textAlignVertical="top"
                  onSelectionChange={handleSelectionChange}
                />
                <View style={[styles.formattedTextContainer]}>
                  <FormattedTextOverlay 
                    content={newNoteContent}
                    formattedSections={formattedSections}
                    style={{
                      color: isDark ? '#FFFFFF' : '#000000',
                      fontSize: 16,
                      padding: 12,
                    }}
                  />
                </View>
              </View>
              
              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { 
                    backgroundColor: newNoteTitle.trim() ? '#FF6B00' : (isDark ? '#444444' : '#CBD5E1'),
                    opacity: newNoteTitle.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleAddNote}
                disabled={!newNoteTitle.trim()}
              >
                <Text style={styles.saveButtonText}>Save Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
      
      {/* Read-Only Note Modal */}
      <Modal
        visible={isReadOnlyModalVisible}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setIsReadOnlyModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <View 
            style={[
              styles.modalContent, 
              styles.readOnlyModalContent,
              { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
            ]}
          >
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                {currentNote?.title}
              </Text>
              <View style={styles.headerButtons}>
                <TouchableOpacity
                  style={[styles.editButton, { backgroundColor: isDark ? '#444444' : '#E2E8F0' }]}
                  onPress={() => currentNote && openEditModal(currentNote)}
                >
                  <Text style={[styles.editButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    ✏️
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={() => setIsReadOnlyModalVisible(false)}
                >
                  <Text style={[styles.closeButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                    ✕
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
            
            <Text style={[styles.noteDate, { color: isDark ? '#666666' : '#94A3B8', marginBottom: 8 }]}>
              {currentNote && formatDate(currentNote.updatedAt)}
            </Text>
            
            <View style={[styles.contentBorder, { borderColor: isDark ? '#333333' : '#E2E8F0' }]}>
              <ScrollView
                style={styles.readOnlyContent}
                contentContainerStyle={{ paddingBottom: 20 }}
                showsVerticalScrollIndicator={true}
              >
                {currentNote ? (
                  <FormattedText 
                    content={getDisplayContent(currentNote.content)}
                    baseStyle={[styles.readOnlyText, { color: isDark ? '#FFFFFF' : '#000000' }]}
                  />
                ) : (
                  <Text style={{ color: isDark ? '#666666' : '#94A3B8' }}>
                    No content available
                  </Text>
                )}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>
      
      {/* Edit Note Modal */}
      <Modal
        visible={isEditModalVisible}
        animationType="slide"
        transparent={true}
        onShow={() => setTimeout(() => titleInputRef.current?.focus(), 100)}
        onRequestClose={() => setIsEditModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
          <View style={styles.modalOverlay}>
            <View 
              style={[
                styles.modalContent, 
                { backgroundColor: isDark ? '#1A1A1A' : '#FFFFFF' }
              ]}
            >
              <View style={styles.modalHeader}>
                <Text style={[styles.modalTitle, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                  Edit Note
                </Text>
                <View style={styles.headerButtons}>
                  <TouchableOpacity
                    style={[styles.deleteButton, { backgroundColor: isDark ? '#444444' : '#FEE2E2' }]}
                    onPress={() => currentNote && handleDeleteNote(currentNote.id)}
                  >
                    <Text style={[styles.deleteButtonText, { color: isDark ? '#FF6666' : '#EF4444' }]}>
                      🗑️
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setIsEditModalVisible(false)}
                  >
                    <Text style={[styles.closeButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>
                      ✕
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
              
              <TextInput
                ref={titleInputRef}
                style={[
                  styles.titleInput, 
                  { 
                    borderColor: isDark ? '#333333' : '#E2E8F0',
                    color: isDark ? '#FFFFFF' : '#000000',
                  }
                ]}
                placeholder="Title"
                placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
                value={newNoteTitle}
                onChangeText={setNewNoteTitle}
                returnKeyType="next"
                onSubmitEditing={() => contentInputRef.current?.focus()}
              />
              
              {/* Formatting Toolbar */}
              <View style={[styles.formattingToolbar, { backgroundColor: isDark ? '#333333' : '#E2E8F0' }]}>
                <TouchableOpacity 
                  style={[
                    styles.toolbarButton,
                    activeFormats.bold && { backgroundColor: isDark ? '#555555' : '#CBD5E1' }
                  ]} 
                  onPress={() => toggleFormatting('bold')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000', fontWeight: 'bold' }]}>B</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toolbarButton,
                    activeFormats.italic && { backgroundColor: isDark ? '#555555' : '#CBD5E1' }
                  ]} 
                  onPress={() => toggleFormatting('italic')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000', fontStyle: 'italic' }]}>I</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={[
                    styles.toolbarButton,
                    activeFormats.underline && { backgroundColor: isDark ? '#555555' : '#CBD5E1' }
                  ]} 
                  onPress={() => toggleFormatting('underline')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000', textDecorationLine: 'underline' }]}>U</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.toolbarButton} 
                  onPress={() => toggleFormatting('bullet')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>•</Text>
                </TouchableOpacity>
                <TouchableOpacity 
                  style={styles.toolbarButton} 
                  onPress={() => toggleFormatting('checkbox')}
                >
                  <Text style={[styles.toolbarButtonText, { color: isDark ? '#FFFFFF' : '#000000' }]}>☐</Text>
                </TouchableOpacity>
              </View>
              
              {/* Render formatted text input for content */}
              <View 
                style={[
                  styles.contentInput, 
                  { 
                    backgroundColor: isDark ? '#2A2A2A' : '#F1F5F9',
                    position: 'relative',
                  }
                ]}
              >
                <TextInput
                  ref={contentInputRef}
                  style={[
                    { 
                      color: 'transparent',
                      padding: 12,
                      fontSize: 16,
                      flex: 1,
                      height: 200,
                      textAlignVertical: 'top',
                    },
                    // Only apply global formatting when no text is selected
                    selection.start === selection.end && activeFormats.bold && { fontWeight: 'bold' },
                    selection.start === selection.end && activeFormats.italic && { fontStyle: 'italic' },
                    selection.start === selection.end && activeFormats.underline ? 
                      { textDecorationLine: 'underline' } : 
                      { textDecorationLine: 'none' }
                  ]}
                  placeholder="Write your note here..."
                  placeholderTextColor={isDark ? '#666666' : '#94A3B8'}
                  value={editedContent}
                  onChangeText={(text) => {
                    // Get change information
                    const lengthDiff = text.length - editedContent.length;
                    
                    // Check if text was added (not deleted)
                    if (lengthDiff > 0 && selection.start === selection.end) {
                      // Text was added at cursor position
                      // Get the position where text was added
                      const insertPos = selection.start;
                      
                      // If any formatting is active, apply it to the newly added text
                      if (activeFormats.bold || activeFormats.italic || activeFormats.underline) {
                        // Calculate the end position of the inserted text
                        const endPos = insertPos + lengthDiff;
                        
                        // Create a new formatted section for the inserted text
                        const newFormattingSection = {
                          start: insertPos,
                          end: endPos,
                          styles: {
                            ...(activeFormats.bold && { bold: true }),
                            ...(activeFormats.italic && { italic: true }),
                            ...(activeFormats.underline && { underline: true })
                          }
                        };
                        
                        // Add the new section
                        const newSections = [...formattedSections, newFormattingSection];
                        
                        // Update existing sections that might be affected by the insert
                        const updatedSections = newSections.map(section => {
                          // If insertion point is before this section, shift it
                          if (insertPos <= section.start && section !== newFormattingSection) {
                            return {
                              ...section,
                              start: section.start + lengthDiff,
                              end: section.end + lengthDiff
                            };
                          }
                          // If insertion point is within this section, expand it
                          else if (insertPos > section.start && insertPos < section.end && section !== newFormattingSection) {
                            return {
                              ...section,
                              end: section.end + lengthDiff
                            };
                          }
                          return section;
                        });
                        
                        setFormattedSections(updatedSections);
                      } else {
                        // No formatting active, just update section positions
                        const updatedSections = formattedSections.map(section => {
                          // If insertion point is before this section, shift it
                          if (insertPos <= section.start) {
                            return {
                              ...section,
                              start: section.start + lengthDiff,
                              end: section.end + lengthDiff
                            };
                          }
                          // If insertion point is within this section, expand it
                          else if (insertPos > section.start && insertPos < section.end) {
                            return {
                              ...section,
                              end: section.end + lengthDiff
                            };
                          }
                          return section;
                        });
                        
                        setFormattedSections(updatedSections);
                      }
                    }
                    // Handle text deletion
                    else if (lengthDiff < 0) {
                      // Calculate deleted text range
                      const deleteStart = selection.start;
                      const deleteEnd = deleteStart - lengthDiff;
                      
                      // Update sections affected by deletion
                      const updatedSections = formattedSections
                        .map(section => {
                          // Section entirely after deletion - shift left
                          if (section.start >= deleteEnd) {
                            return {
                              ...section,
                              start: Math.max(0, section.start + lengthDiff),
                              end: Math.max(0, section.end + lengthDiff)
                            };
                          }
                          // Section entirely before deletion - keep as is
                          else if (section.end <= deleteStart) {
                            return section;
                          }
                          // Section overlaps with deletion - adjust boundaries
                          else {
                            // If deletion completely contains the section, remove it
                            if (deleteStart <= section.start && deleteEnd >= section.end) {
                              return null;
                            }
                            // If deletion is in the middle of the section, shrink it
                            else if (deleteStart > section.start && deleteEnd < section.end) {
                              return {
                                ...section,
                                end: section.end + lengthDiff
                              };
                            }
                            // If deletion removes the start of the section
                            else if (deleteStart <= section.start && deleteEnd < section.end) {
                              return {
                                ...section,
                                start: deleteStart,
                                end: section.end + lengthDiff
                              };
                            }
                            // If deletion removes the end of the section
                            else if (deleteStart > section.start && deleteEnd >= section.end) {
                              return {
                                ...section,
                                end: deleteStart
                              };
                            }
                          }
                          return section;
                        })
                        .filter(Boolean) as Array<{
                          start: number;
                          end: number;
                          styles: {
                            bold?: boolean;
                            italic?: boolean;
                            underline?: boolean;
                          };
                        }>;
                      
                      setFormattedSections(updatedSections);
                    }
                    
                    setEditedContent(text);
                  }}
                  multiline
                  textAlignVertical="top"
                  onSelectionChange={handleSelectionChange}
                />
                <View style={[styles.formattedTextContainer]}>
                  <FormattedTextOverlay 
                    content={editedContent}
                    formattedSections={formattedSections}
                    style={{
                      color: isDark ? '#FFFFFF' : '#000000',
                      fontSize: 16,
                      padding: 12,
                    }}
                  />
                </View>
              </View>
              
              {currentNote && (
                <Text style={[styles.lastUpdated, { color: isDark ? '#666666' : '#94A3B8' }]}>
                  Last updated: {formatDate(currentNote.updatedAt)}
                </Text>
              )}
              
              <TouchableOpacity
                style={[
                  styles.saveButton, 
                  { 
                    backgroundColor: newNoteTitle.trim() ? '#FF6B00' : (isDark ? '#444444' : '#CBD5E1'),
                    opacity: newNoteTitle.trim() ? 1 : 0.5
                  }
                ]}
                onPress={handleUpdateNote}
                disabled={!newNoteTitle.trim()}
              >
                <Text style={styles.saveButtonText}>Update Note</Text>
              </TouchableOpacity>
            </View>
          </View>
        </TouchableWithoutFeedback>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  addButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  addButtonText: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  searchContainer: {
    marginBottom: 16,
  },
  searchInput: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyStateText: {
    fontSize: 16,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  notesList: {
    paddingBottom: 100,
  },
  noteItem: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    flex: 1,
  },
  noteDate: {
    fontSize: 12,
  },
  noteExcerpt: {
    fontSize: 14,
    lineHeight: 20,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16,
  },
  modalContent: {
    width: '100%',
    borderRadius: 12,
    padding: 16,
    maxHeight: '90%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    flex: 1,
    marginRight: 8,
  },
  headerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  closeButton: {
    padding: 4,
  },
  closeButtonText: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  deleteButton: {
    padding: 8,
    borderRadius: 8,
    marginRight: 8,
  },
  deleteButtonText: {
    fontSize: 16,
  },
  titleInput: {
    borderBottomWidth: 1,
    fontSize: 18,
    fontWeight: '600',
    paddingVertical: 12,
    marginBottom: 16,
  },
  formattingToolbar: {
    flexDirection: 'row',
    padding: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  toolbarButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginHorizontal: 4,
  },
  toolbarButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  contentInput: {
    flex: 1,
    borderRadius: 8,
    minHeight: 200,
    marginBottom: 16,
    overflow: 'hidden',
  },
  previewContainer: {
    marginBottom: 16,
  },
  previewTitle: {
    fontWeight: 'bold',
    marginBottom: 8,
  },
  preview: {
    borderRadius: 8,
    padding: 12,
    minHeight: 100,
  },
  lastUpdated: {
    fontSize: 12,
    textAlign: 'right',
    marginBottom: 16,
  },
  saveButton: {
    padding: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    color: '#FFFFFF',
    fontWeight: '600',
    fontSize: 16,
  },
  formattedTextOverlay: {
    minHeight: 200,
    pointerEvents: 'none',
  },
  formattedTextContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    pointerEvents: 'none',
  },
  readOnlyModalContent: {
    height: '80%',
    paddingBottom: 20,
    display: 'flex',
    flexDirection: 'column',
  },
  readOnlyContent: {
    flex: 1,
    marginTop: 12,
  },
  readOnlyText: {
    fontSize: 16,
    lineHeight: 24,
    padding: 8,
  },
  editButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  editButtonText: {
    fontSize: 16,
  },
  contentBorder: {
    borderWidth: 1,
    borderRadius: 8,
    marginBottom: 16,
    flex: 1,
    overflow: 'hidden',
  },
}); 