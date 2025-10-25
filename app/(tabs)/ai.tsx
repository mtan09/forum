import { CustomDropdown } from '@/components/customDropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { Message, mockMessages } from '@/data/mockMessages';
import { useEffect, useRef, useState } from 'react';
import { Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

export default function AI() {

  type Topic = {
    id: string;
    name: string;
  }

  const topics = [
    { id: '1', name: 'Gaza Ceasefire' },
    { id: '2', name: 'NYC Mayoral Race' },
  ]

  const [ activeTopic, setActiveTopic ] = useState<Topic | null>(null);

  const toggleTopic = (topic: Topic) => {
    if (activeTopic?.id === topic.id) {
      setActiveTopic(null);
    } else {
      setActiveTopic(topic);
    }
  };

  const [inputText, setInputText] = useState('');

  const framings = [
    "General Audience",
    "Student",
    "Policymaker/Professional",
    "Skeptic/Critial Thinker",
    "Journalist/Analyst",
  ]

  const [ activeFraming, setActiveFraming ] = useState(framings[0]);

  const [ hasStarted, setHasStarted ] = useState(false);

  const handleEndChat = () => {
    setHasStarted(false);
    setInputText('');
    setActiveFraming(framings[0]);
    setActiveTopic(null);
    setMessages([]); // clear chat log
    Keyboard.dismiss();
  };

  const [messages, setMessages] = useState<Message[]>(mockMessages); // start with an empty chat log
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!hasStarted) return;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, hasStarted]);

  const canSend = inputText.trim().length > 0;

  return(
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
    >
      <ThemedView style={ styles.container }>

        {/* Header */}
        {hasStarted && (
          <ThemedView style={styles.header}>
            <ThemedText type="defaultSemiBold" style={styles.headerTitle}>forumAI</ThemedText>
            <Pressable
              onPress={handleEndChat}
            >
              <IconSymbol name="x.circle.fill" size={32} color="#7049e0" />
            </Pressable>
          </ThemedView>
        )}

        {/* Logo and Title */}
        {!hasStarted ? (
          <Pressable onPress={Keyboard.dismiss}>
            <ThemedView style={styles.imageContainer}>
              <Image source={require('@/assets/images/forumlogo.png')} style={{ width: 200, height: 200}} />
              <ThemedText type="title" style={styles.title}>forumAI</ThemedText>
            </ThemedView>
          </Pressable>
        ) : (
          <ScrollView
            ref={scrollRef}
            style={styles.chatContainer}
            contentContainerStyle={styles.chatContent}
            showsVerticalScrollIndicator={true}
            onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: true })}
            keyboardDismissMode="on-drag"
            keyboardShouldPersistTaps="handled"
            onScrollBeginDrag={() => Keyboard.dismiss()}
          >
            {messages.map(message => (
              <ThemedView
                key={message.id}
                style={[
                  message.sender === 'user' ? styles.userMessage : styles.aiMessage
                ]}
              >
                <ThemedText style={message.sender === 'user' ? styles.userText : styles.aiText}>
                  {message.content}
                </ThemedText>
              </ThemedView>
            ))}
          </ScrollView>
        )}
        
        <ThemedView style={[
            styles.inputContainer,
            hasStarted ? styles.inputContainerActive : null
          ]}
        >

          {/* Topic Quickselect */}
          {!hasStarted && (

            <ThemedView style={styles.topicSelector}>
              {topics.map(topic => (
                <ThemedView key={topic.id}>
                  <Pressable
                    onPress={() => toggleTopic(topic)}
                  >
                    <ThemedText style={{ 
                      fontSize: 14, 
                      fontWeight: activeTopic === topic ? '800' : '600', 
                      color: activeTopic === topic ? '#592edc' : '#8f8f8f',
                    }}>🟪 {topic.name}</ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </ThemedView>
          )}

          {/* Explain like I'm ... */}
          <ThemedView style={styles.pickerContainer}>
            <ThemedText style={{fontWeight: '600'}}>🎓 Explain like I'm: </ThemedText>
            <CustomDropdown
              options={framings}
              value={activeFraming}
              onValueChange={setActiveFraming}
            />
          </ThemedView>
          
          {/* Input Box */}
          <ThemedView style={styles.input}>
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder={activeTopic === null ? "Ask forumAI a question..." : `Ask forumAI about ${activeTopic.name}...`}
              placeholderTextColor='#8f8f8f'
              multiline
              style={styles.textInput}
              scrollEnabled={true}
              textAlignVertical="top"
            />
            <Pressable
              disabled={!canSend}
              onPress={() => {
                if (inputText.trim() === '') return;
                console.log('Sending:' + inputText + ' ' + activeFraming + ' ' + (activeTopic ? activeTopic.name : 'No topic selected'));
                setInputText('');
                Keyboard.dismiss();
                setHasStarted(true);
              }}
            >
              <IconSymbol name="arrow.up.circle.fill" size={32} color={canSend ? "#7049e0" : "#cfc7f3"} />
            </Pressable>
          </ThemedView>  

        </ThemedView>

      </ThemedView>

    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  imageContainer: {
    position: 'relative',
  },
  title: {
    position: 'absolute',
    top: 175,
    alignSelf: 'center',
    color: '#7049e0',
  },
  topicSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderColor: '#baa8f0',
    borderRadius: 16,
    borderWidth: 2,
    paddingHorizontal: 8,
    width: screenWidth - 48,
    paddingVertical: 4,
  },
  textInput: {
    textAlign: 'left',
    width: screenWidth - 102,
    fontWeight: '600',
    fontSize: 16,
    maxHeight: 64,
    // borderColor: 'black',
    // borderWidth: 2,
  },
  // pickerContainer: {
  //   flexDirection: 'row',
  //   alignItems: 'center',
  // },
  picker: {
    width: 200,
    height: 20,
    backgroundColor: '#baa8f0',
    borderRadius: 16,
  },
  option: {
    fontSize: 14,
  },
  pickerContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  inputContainer: {
    gap: 6,
    alignItems: 'center',
    justifyContent: 'center',
    width: screenWidth,
    backgroundColor: 'white',
    paddingVertical: 8,
  },
  inputContainerActive: {
    position: 'absolute',
    bottom: 0,
    paddingBottom: 16,
  },
  header: {
    position: 'absolute',
    top: 60,
    flexDirection: 'row',
    borderBottomColor: '#c6c6c6ff',
    borderBottomWidth: 1,
    width: '100%',
    paddingHorizontal: 16,
    paddingBottom: 8,
    justifyContent: 'space-between',
    alignItems: 'center',
    height: 48,
  },
  headerTitle: {
    color: '#7049e0',
    fontWeight: '800',
    fontSize: 20,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#7049e0',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderTopRightRadius: 4,
    maxWidth: '80%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f1effc',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderTopLeftRadius: 4,
    maxWidth: '80%',
    borderWidth: 1,
    borderColor: '#e0d9fb',
  },
  userText: {
    color: 'white',
    fontWeight: '600',
  },
  aiText: {
    color: '#1a1a1a',
  },
  chatContainer: {
    position: 'absolute',
    top: 108,
    height: screenHeight - 200,
    width: '100%',
  },
  chatContent: {
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 112, // some extra space above the input
  }
});