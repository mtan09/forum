import { CustomDropdown } from '@/components/customDropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { API_URL, getToken } from '@/lib/api';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useLocalSearchParams } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import { useEffect, useRef, useState } from 'react';
import { Animated, Dimensions, Image, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

const screenWidth = Dimensions.get('window').width;
const screenHeight = Dimensions.get('window').height;

type Message = {
  id: string;
  content: string;
  sender: 'user' | 'ai';
  left?: string;
  center?: string;
  right?: string;
  streaming?: boolean;
  error?: boolean;
};

const AnimatedLoadingDots = () => {
  const dot1 = useRef(new Animated.Value(0)).current;
  const dot2 = useRef(new Animated.Value(0)).current;
  const dot3 = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const createAnimation = (value: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.delay(delay),
          Animated.timing(value, {
            toValue: 1,
            duration: 300,
            useNativeDriver: true,
          }),
          Animated.timing(value, {
            toValue: 0,
            duration: 300,
            useNativeDriver: true,
          }),
        ])
      );
    };

    Animated.parallel([
      createAnimation(dot1, 0),
      createAnimation(dot2, 150),
      createAnimation(dot3, 300),
    ]).start();
  }, [dot1, dot2, dot3]);

  return (
    <ThemedView style={styles.loadingDotsContainer}>
      <Animated.View style={{ opacity: dot1 }}>
        <ThemedText style={styles.loadingDot}>●</ThemedText>
      </Animated.View>
      <Animated.View style={{ opacity: dot2 }}>
        <ThemedText style={styles.loadingDot}>●</ThemedText>
      </Animated.View>
      <Animated.View style={{ opacity: dot3 }}>
        <ThemedText style={styles.loadingDot}>●</ThemedText>
      </Animated.View>
    </ThemedView>
  );
};

export default function AI() {

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

  // "Ask forumAI about this" — article/post pages navigate here with these
  // params; the subject rides along with every request until dismissed.
  const params = useLocalSearchParams<{
    subjectKind?: string;
    subjectId?: string;
    subjectTitle?: string;
    subjectTs?: string;
  }>();
  const [subject, setSubject] = useState<{ kind: 'article' | 'post'; id: string; title: string } | null>(null);
  const consumedSubjectRef = useRef<string | null>(null);

  useEffect(() => {
    if (!params.subjectId || !params.subjectKind) return;
    const stamp = `${params.subjectId}:${params.subjectTs ?? ''}`;
    if (consumedSubjectRef.current === stamp) return; // already applied this tap
    consumedSubjectRef.current = stamp;
    setSubject({
      kind: params.subjectKind === 'post' ? 'post' : 'article',
      id: params.subjectId,
      title: params.subjectTitle || (params.subjectKind === 'post' ? 'a community post' : 'an article'),
    });
  }, [params.subjectId, params.subjectKind, params.subjectTitle, params.subjectTs]);

  const handleEndChat = () => {
    setHasStarted(false);
    setInputText('');
    setActiveFraming(framings[0]);
    setActiveLean('Center');
    setSubject(null);
    setMessages([]); // clear chat log
    Keyboard.dismiss();
  };

  const [messages, setMessages] = useState<Message[]>([]); // start with an empty chat log
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  useEffect(() => {
    if (!hasStarted) return;
    scrollRef.current?.scrollToEnd({ animated: true });
  }, [messages, hasStarted]);

  const canSend = inputText.trim().length > 0 && !isLoading;

  const [ activeLean, setActiveLean ] = useState<'Left' | 'Center' | 'Right'>('Center');

  const handleMessageSend = (userMessage: string) => {
    // Everything already on screen becomes the model's context, so
    // follow-up questions can reference earlier turns.
    const history = messages
      .filter((m) => !m.error)
      .map((m) =>
        m.sender === 'user'
          ? { role: 'user', content: m.content }
          : { role: 'assistant', left: m.left, center: m.center, right: m.right }
      );

    const aiId = `${Date.now()}-ai`;
    setMessages(prev => [
      ...prev,
      { id: Date.now().toString(), sender: 'user', content: userMessage },
      { id: aiId, sender: 'ai', content: '', left: '', center: '', right: '', streaming: true },
    ]);
    setIsLoading(true);

    const patchAi = (patch: Partial<Message>) => {
      setMessages(prev => prev.map(m => (m.id === aiId ? { ...m, ...patch } : m)));
    };

    const streamMessage = async () => {
      // Deltas accumulate here and flush to state at most ~12x/sec so the
      // markdown renderer isn't re-parsing on every single token.
      const acc = { left: '', center: '', right: '' };
      let lastFlush = 0;
      const flush = () => {
        const now = Date.now();
        if (now - lastFlush < 80) return;
        lastFlush = now;
        patchAi({ left: acc.left, center: acc.center, right: acc.right });
      };

      try {
        const token = await getToken();
        const res = await expoFetch(`${API_URL}/ai/chat`, {
          method: 'POST',
          headers: {
            'content-type': 'application/json',
            accept: 'text/event-stream',
            ...(token ? { authorization: `Bearer ${token}` } : {}),
          },
          body: JSON.stringify({
            message: userMessage,
            framing: activeFraming,
            history,
            article_id: subject?.kind === 'article' ? subject.id : undefined,
            post_id: subject?.kind === 'post' ? subject.id : undefined,
          }),
        });
        if (!res.ok || !res.body) {
          const data = await res.json().catch(() => null);
          throw new Error(data?.error ?? `Request failed (${res.status})`);
        }

        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let pending = '';
        let finished = false;

        const handleFrame = (frame: string) => {
          let event = 'message';
          let data = '';
          for (const line of frame.split('\n')) {
            if (line.startsWith('event:')) event = line.slice(6).trim();
            else if (line.startsWith('data:')) data += line.slice(5).trim();
          }
          if (!data) return;
          const payload = JSON.parse(data);
          if (event === 'delta') {
            acc[payload.perspective as 'left' | 'center' | 'right'] += payload.text;
            flush();
          } else if (event === 'done') {
            acc.left = payload.left;
            acc.center = payload.center;
            acc.right = payload.right;
            finished = true;
          } else if (event === 'error') {
            throw new Error(payload.error);
          }
        };

        // SSE frames are "event:/data:" line groups separated by blank lines
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          pending += decoder.decode(value, { stream: true });
          const frames = pending.split('\n\n');
          pending = frames.pop() ?? '';
          for (const frame of frames) handleFrame(frame);
        }

        if (!finished && !(acc.left || acc.center || acc.right)) {
          throw new Error('forumAI returned an empty response — try again.');
        }
        patchAi({ left: acc.left, center: acc.center, right: acc.right, streaming: false });
      } catch (error: any) {
        console.error('Error invoking forumAI:', error?.message);
        const msg = error?.message ?? 'forumAI is unavailable right now.';
        patchAi({ left: msg, center: msg, right: msg, streaming: false, error: true });
      } finally {
        setIsLoading(false);
      }
    };

    streamMessage();
  };

  const prevMessageCountRef = useRef(0);

  useEffect(() => {
    if (messages.length > prevMessageCountRef.current) {
      scrollRef.current?.scrollToEnd({ animated: true });
      prevMessageCountRef.current = messages.length;
    }
  }, [messages]);

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
              <IconSymbol name="x.circle.fill" size={32} color="#b647ff" />
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
                {message.sender === 'ai' ? (
                  <ThemedView style={styles.leanContainer}>
                    <Pressable
                      onPress={() => setActiveLean('Left')}
                    >
                      <ThemedView style={[styles.lean, {borderBottomLeftRadius: 16, borderTopLeftRadius: 16, backgroundColor: activeLean === 'Left' ? '#b647ff' : '#E9C8FF'}]}>
                        <ThemedText style={styles.leanText}>Left</ThemedText>
                      </ThemedView>
                        
                    </Pressable>
                    <Pressable
                      onPress={() => setActiveLean('Center')}
                    >
                      <ThemedView style={[styles.lean, {borderLeftColor: 'white', borderRightColor: 'white', borderLeftWidth: 1, borderRightWidth: 1, backgroundColor: activeLean === 'Center' ? '#b647ff' : '#E9C8FF'}]}>
                        <ThemedText style={styles.leanText}>Center</ThemedText>
                      </ThemedView>
                        
                    </Pressable>
                    <Pressable
                      onPress={() => setActiveLean('Right')}
                    >
                      <ThemedView style={[styles.lean, {borderBottomRightRadius: 16, borderTopRightRadius: 16, backgroundColor: activeLean === 'Right' ? '#b647ff' : '#E9C8FF'}]}>
                        <ThemedText style={styles.leanText}>Right</ThemedText>
                      </ThemedView>
                        
                    </Pressable>
                  </ThemedView>
                ) : null}

                {message.sender === 'user' ? (
                  <ThemedText style={styles.userText}>
                    {message.content}
                  </ThemedText>
                ) : message.error ? (
                  <ThemedText style={styles.aiErrorText}>
                    {message.center || message.content}
                  </ThemedText>
                ) : (activeLean === 'Left' ? message.left : (activeLean === 'Center' ? message.center : message.right)) ? (
                  <Markdown style={markdownStyles}>
                    {(activeLean === 'Left' ? message.left : (activeLean === 'Center' ? message.center : message.right)) ?? ''}
                  </Markdown>
                ) : (
                  // This perspective hasn't started generating yet (they
                  // stream in order: left, center, right)
                  <AnimatedLoadingDots />
                )}
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
          {/* {!hasStarted && (

            <ThemedView style={styles.topicSelector}>
              {topics.map(topic => (
                <ThemedView key={topic.id}>
                  <Pressable
                    onPress={() => toggleTopic(topic)}
                  >
                    <ThemedText style={{ 
                      fontSize: 14, 
                      fontWeight: activeTopic === topic ? '800' : '600', 
                      color: activeTopic === topic ? '#b647ff' : '#8f8f8f',
                    }}>🟪 {topic.name}</ThemedText>
                  </Pressable>
                </ThemedView>
              ))}
            </ThemedView>
          )} */}

          {/* Subject chip — what "Ask forumAI" was tapped on */}
          {subject && (
            <ThemedView style={styles.subjectChip}>
              <IconSymbol name="sparkles" size={16} color="#b647ff" />
              <ThemedText numberOfLines={1} style={styles.subjectChipText}>
                {subject.kind === 'article' ? 'Article' : 'Post'}: {subject.title}
              </ThemedText>
              <Pressable onPress={() => setSubject(null)} hitSlop={8}>
                <IconSymbol name="x.circle.fill" size={18} color="#b647ff" />
              </Pressable>
            </ThemedView>
          )}

          {/* Explain like I'm ... */}
          <ThemedView style={styles.pickerContainer}>
            <ThemedText style={{fontWeight: '600'}}>🎓 Explain like I&apos;m: </ThemedText>
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
              placeholder={subject ? `Ask about this ${subject.kind}...` : "Ask forumAI a question..."}
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
                handleMessageSend(inputText.trim());
                setInputText('');
                Keyboard.dismiss();
                setHasStarted(true);
              }}
            >
              <IconSymbol name="arrow.up.circle.fill" size={32} color={canSend ? "#B647FF" : "#dfaeffff"} />
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
    color: '#b647ff',
  },
  topicSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  input: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'flex-start',
    borderColor: '#E9C8FF',
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
    backgroundColor: '#E9C8FF',
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
  subjectChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#F1E8FB',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 6,
    maxWidth: screenWidth - 48,
  },
  subjectChipText: {
    flexShrink: 1,
    color: '#7A1FD0',
    fontWeight: '600',
    fontSize: 13,
    lineHeight: 18,
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
    color: '#B647FF',
    fontWeight: '800',
    fontSize: 20,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: '#B647FF',
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 16,
    borderTopRightRadius: 4,
    maxWidth: '80%',
  },
  aiMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#f8effcff',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 16,
    width: '100%',
    borderWidth: 1,
    borderColor: '#e0d9fb',
  },
  userText: {
    color: 'white',
    fontWeight: '600',
  },
  aiErrorText: {
    color: '#B3261E',
    fontWeight: '600',
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
  },
  leanContainer: {
    flexDirection: 'row',
    marginVertical: 16,
    width: screenWidth - 64,
    alignSelf: 'center',
    borderRadius: 16,
    height: 32,
    gap: 0
  },
  leanText: {
    fontSize: 20,
    textAlign: 'center',
    color: 'white',
    fontWeight: '800',
  },
  lean: {
    width: (screenWidth - 64) /3,
    height: 32,
    justifyContent: 'center',
    // paddingTop: 4,
  },
  loadingDot: {
    color: '#B647FF',
    fontSize: 16,
    fontWeight: '600',
  },
  loadingDots: {
    color: '#B647FF',
    fontSize: 18,
    fontWeight: '600',
    letterSpacing: 2,
  },
  loadingDotsContainer: {
    flexDirection: 'row',
    gap: 4,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  }
});

// Styles for the markdown-rendered AI answers — tuned so streamed responses
// read as short scannable paragraphs instead of a slab of text.
const markdownStyles = StyleSheet.create({
  body: { color: '#1a1a1a', fontSize: 15, lineHeight: 22 },
  paragraph: { marginTop: 0, marginBottom: 10 },
  strong: { fontWeight: '700', color: '#7A1FD0' },
  em: { fontStyle: 'italic' },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  list_item: { marginBottom: 4 },
  blockquote: { backgroundColor: '#F1E8FB', borderLeftColor: '#B647FF', borderLeftWidth: 3, paddingHorizontal: 10, borderRadius: 6 },
  code_inline: { backgroundColor: '#EFE3FB', borderRadius: 4, paddingHorizontal: 4 },
  heading1: { fontSize: 17, fontWeight: '800', marginBottom: 6 },
  heading2: { fontSize: 16, fontWeight: '800', marginBottom: 6 },
  heading3: { fontSize: 15, fontWeight: '800', marginBottom: 6 },
});