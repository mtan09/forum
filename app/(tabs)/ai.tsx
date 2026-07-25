import { CustomDropdown } from '@/components/customDropdown';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { API_URL, getToken } from '@/lib/api';
import { getPerspectiveTone } from '@/lib/perspective-colors';
import Markdown from '@ronradtke/react-native-markdown-display';
import { useLocalSearchParams } from 'expo-router';
import { fetch as expoFetch } from 'expo/fetch';
import { useEffect, useMemo, useRef, useState } from 'react';
import { Animated, Keyboard, KeyboardAvoidingView, Platform, Pressable, ScrollView, StyleSheet, TextInput } from 'react-native';

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
  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
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

  const { c } = usePalette();
  const styles = useMemo(() => makeStyles(c), [c]);
  const markdownStyles = useMemo(() => makeMarkdownStyles(c), [c]);

  const [inputText, setInputText] = useState('');

  const framings = [
    "General Audience",
    "Student",
    "Policymaker/Professional",
    "Skeptic/Critical Thinker",
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

  const suggestedPrompts = [
    'What are both sides missing about housing costs?',
    'Explain today’s biggest story without the spin.',
    'Where do the left and right actually agree?',
  ];

  const submit = (text = inputText) => {
    const trimmed = text.trim();
    if (!trimmed || isLoading) return;
    handleMessageSend(trimmed);
    setInputText('');
    Keyboard.dismiss();
    setHasStarted(true);
  };

  const renderComposer = (compact = false) => (
    <ThemedView style={[styles.composerArea, compact && styles.composerAreaCompact]}>
      {subject && (
        <ThemedView style={styles.subjectChip}>
          <ThemedText numberOfLines={1} style={styles.subjectChipText}>
            {subject.kind === 'article' ? 'Article' : 'Post'} · {subject.title}
          </ThemedText>
          <Pressable onPress={() => setSubject(null)} hitSlop={8}>
            <IconSymbol name="x.circle.fill" size={17} color={c.primary} />
          </Pressable>
        </ThemedView>
      )}
      <ThemedView style={styles.framingRow}>
        <ThemedView style={styles.framingLabel}>
          <IconSymbol name="person.fill" size={14} color={c.muted} />
          <ThemedText style={styles.framingLabelText}>Answer for</ThemedText>
        </ThemedView>
        <CustomDropdown
          options={framings}
          value={activeFraming}
          onValueChange={setActiveFraming}
          title="Answer for"
          subtitle="Choose who forumAI should write for."
        />
      </ThemedView>
      <ThemedView style={styles.composer}>
        <TextInput
          value={inputText}
          onChangeText={setInputText}
          placeholder={subject ? `Ask about this ${subject.kind}…` : 'Ask a political question…'}
          placeholderTextColor={c.muted}
          multiline
          style={styles.textInput}
          scrollEnabled
          textAlignVertical="top"
          returnKeyType="send"
          blurOnSubmit={false}
        />
        <Pressable
          disabled={!canSend}
          onPress={() => submit()}
          style={[styles.sendButton, { backgroundColor: canSend ? c.primary : c.surfaceMuted }]}
          accessibilityRole="button"
          accessibilityLabel="Send question"
        >
          <IconSymbol name="paperplane.fill" size={18} color={canSend ? c.onPrimary : c.textDisabled} />
        </Pressable>
      </ThemedView>
      {!compact && <ThemedText style={styles.disclaimer}>forumAI compares perspectives; verify important claims with primary sources.</ThemedText>}
    </ThemedView>
  );

  return (
    <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : 'height'} style={styles.keyboardView}>
      <ThemedView style={styles.container}>
        {!hasStarted ? (
          <ScrollView
            contentContainerStyle={styles.landingContent}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="on-drag"
          >
            <ThemedView style={styles.landingTitleRow}>
              <IconSymbol name="brain.fill" size={36} color={c.primary} style={styles.landingBrain} />
              <ThemedText type="title" style={styles.landingTitle}>forumAI</ThemedText>
            </ThemedView>

            <ThemedView style={styles.perspectivePreview}>
              {[
                getPerspectiveTone('Left', c),
                getPerspectiveTone('Center', c),
                getPerspectiveTone('Right', c),
              ].map((item) => (
                <ThemedView key={item.label} style={[styles.perspectiveCard, { backgroundColor: item.background, borderLeftColor: item.color }]}>
                  <ThemedView style={[styles.perspectiveTag, { backgroundColor: item.color }]}>
                    <ThemedText style={styles.perspectiveLabel}>{item.label}</ThemedText>
                  </ThemedView>
                </ThemedView>
              ))}
            </ThemedView>

            {renderComposer()}

            <ThemedView style={styles.suggestionsSection}>
              <ThemedView style={styles.sectionHeadingRow}>
                <ThemedText style={styles.sectionHeading}>Try a sharper question</ThemedText>
                <ThemedText style={styles.sectionHint}>Tap to use</ThemedText>
              </ThemedView>
              {suggestedPrompts.map((prompt, index) => (
                <Pressable
                  key={prompt}
                  onPress={() => setInputText(prompt)}
                  style={({ pressed }) => [styles.suggestion, { opacity: pressed ? 0.65 : 1 }]}
                >
                  <ThemedView style={styles.suggestionNumber}>
                    <ThemedText style={styles.suggestionNumberText}>0{index + 1}</ThemedText>
                  </ThemedView>
                  <ThemedText style={styles.suggestionText}>{prompt}</ThemedText>
                  <IconSymbol name="chevron.right" size={17} color={c.faint} />
                </Pressable>
              ))}
            </ThemedView>
          </ScrollView>
        ) : (
          <>
            <ThemedView style={styles.header}>
              <ThemedView style={styles.headerBrand}>
                <ThemedView style={styles.headerCopy}>
                  <ThemedText style={styles.headerTitle}>forumAI</ThemedText>
                  <ThemedText style={styles.headerSubtitle}>Three perspectives · one question</ThemedText>
                </ThemedView>
              </ThemedView>
              <Pressable onPress={handleEndChat} style={styles.newChatButton} accessibilityRole="button" accessibilityLabel="End chat and start over">
                <IconSymbol name="plus" size={18} color={c.primary} />
                <ThemedText style={styles.newChatText}>New</ThemedText>
              </Pressable>
            </ThemedView>

            <ScrollView
              ref={scrollRef}
              style={styles.chatContainer}
              contentContainerStyle={styles.chatContent}
              showsVerticalScrollIndicator={false}
              keyboardDismissMode="on-drag"
              keyboardShouldPersistTaps="handled"
              onScrollBeginDrag={() => Keyboard.dismiss()}
            >
              {messages.map((message) =>
                message.sender === 'user' ? (
                  <ThemedView key={message.id} style={styles.userMessage}>
                    <ThemedText style={styles.userMessageLabel}>YOU</ThemedText>
                    <ThemedText style={styles.userText}>{message.content}</ThemedText>
                  </ThemedView>
                ) : (
                  <ThemedView key={message.id} style={styles.aiMessage}>
                    <ThemedView style={styles.answerHeader}>
                      <ThemedView style={styles.answerHeadingCopy}>
                        <ThemedText style={styles.answerEyebrow}>FORUMAI ANALYSIS</ThemedText>
                        <ThemedText style={styles.answerHeading}>Choose a lens</ThemedText>
                      </ThemedView>
                      {message.streaming && <ThemedText style={styles.streamingLabel}>LIVE</ThemedText>}
                    </ThemedView>

                    <ThemedView style={styles.lensTabs}>
                      {(['Left', 'Center', 'Right'] as const).map((lean) => {
                        const selected = activeLean === lean;
                        const leanColor = getPerspectiveTone(lean, c).color;
                        return (
                          <Pressable
                            key={lean}
                            onPress={() => setActiveLean(lean)}
                            style={[styles.lensTab, selected && { backgroundColor: c.background, borderColor: c.cardBorder }]}
                          >
                            <ThemedView style={[styles.lensDot, { backgroundColor: leanColor }]} />
                            <ThemedText style={[styles.lensTabText, selected && { color: c.text }]}>{lean}</ThemedText>
                          </Pressable>
                        );
                      })}
                    </ThemedView>

                    <ThemedView style={styles.answerBody}>
                      {message.error ? (
                        <ThemedText style={styles.aiErrorText}>{message.center || message.content}</ThemedText>
                      ) : (activeLean === 'Left' ? message.left : activeLean === 'Center' ? message.center : message.right) ? (
                        <Markdown style={markdownStyles}>
                          {(activeLean === 'Left' ? message.left : activeLean === 'Center' ? message.center : message.right) ?? ''}
                        </Markdown>
                      ) : (
                        <ThemedView style={styles.loadingState}>
                          <AnimatedLoadingDots />
                          <ThemedText style={styles.loadingText}>Building the {activeLean.toLowerCase()} perspective…</ThemedText>
                        </ThemedView>
                      )}
                    </ThemedView>

                    <ThemedView style={styles.answerFooter}>
                      <IconSymbol name="newspaper.fill" size={13} color={c.muted} />
                      <ThemedText style={styles.answerFooterText}>Grounded in coverage from the forum article corpus</ThemedText>
                    </ThemedView>
                  </ThemedView>
                )
              )}
            </ScrollView>
            {renderComposer(true)}
          </>
        )}
      </ThemedView>
    </KeyboardAvoidingView>
  );
}

const makeStyles = (c: Palette) => StyleSheet.create({
  keyboardView: { flex: 1 },
  container: { flex: 1 },
  landingContent: { paddingTop: 82, paddingHorizontal: 16, paddingBottom: 44 },
  landingTitleRow: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' },
  landingBrain: { transform: [{ translateY: -2 }] },
  landingTitle: { color: c.primary },
  perspectivePreview: { flexDirection: 'row', gap: 8, marginTop: 20, backgroundColor: 'transparent' },
  perspectiveCard: { flex: 1, minHeight: 50, borderRadius: 12, borderLeftWidth: 4, paddingHorizontal: 8, justifyContent: 'center' },
  perspectiveTag: { alignSelf: 'flex-start', borderRadius: 9, paddingHorizontal: 8, paddingVertical: 2 },
  perspectiveLabel: { color: c.onPrimary, fontSize: 12, lineHeight: 16, fontWeight: '800' },
  composerArea: { marginTop: 22, borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, padding: 12, gap: 9, shadowColor: c.shadow, shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.08, shadowRadius: 14, elevation: 3 },
  composerAreaCompact: { marginTop: 0, borderRadius: 0, borderWidth: 0, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 12, paddingTop: 10, paddingBottom: Platform.OS === 'ios' ? 16 : 10, shadowOpacity: 0 },
  subjectChip: { flexDirection: 'row', alignItems: 'center', gap: 6, backgroundColor: c.accentSoftBg, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 6 },
  subjectChipText: { flex: 1, color: c.onAccentFaint, fontWeight: '700', fontSize: 12, lineHeight: 16 },
  framingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: 'transparent', minHeight: 28 },
  framingLabel: { flexDirection: 'row', alignItems: 'center', gap: 5, backgroundColor: 'transparent' },
  framingLabelText: { color: c.muted, fontSize: 12, fontWeight: '700' },
  composer: { minHeight: 54, flexDirection: 'row', alignItems: 'flex-end', gap: 8, borderRadius: 15, borderWidth: 1.5, borderColor: c.accentFaint, backgroundColor: c.background, paddingLeft: 12, paddingRight: 7, paddingVertical: 7 },
  textInput: { flex: 1, minHeight: 38, maxHeight: 92, color: c.text, fontSize: 15, lineHeight: 20, fontWeight: '600', paddingVertical: 7 },
  sendButton: { width: 38, height: 38, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  disclaimer: { color: c.muted, fontSize: 10, lineHeight: 14, textAlign: 'center' },
  suggestionsSection: { marginTop: 26, backgroundColor: 'transparent' },
  sectionHeadingRow: { flexDirection: 'row', alignItems: 'baseline', justifyContent: 'space-between', marginBottom: 8, backgroundColor: 'transparent' },
  sectionHeading: { fontWeight: '900', fontSize: 15 },
  sectionHint: { color: c.muted, fontSize: 11 },
  suggestion: { minHeight: 58, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', gap: 11, backgroundColor: 'transparent' },
  suggestionNumber: { width: 30, height: 30, borderRadius: 9, backgroundColor: c.accentSoftBg, alignItems: 'center', justifyContent: 'center' },
  suggestionNumberText: { color: c.accentDeep, fontSize: 10, fontWeight: '900' },
  suggestionText: { flex: 1, fontSize: 13, lineHeight: 18, fontWeight: '700' },
  header: { minHeight: 116, paddingTop: 62, paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1, borderBottomColor: c.border, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  headerBrand: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: 'transparent' },
  headerCopy: { backgroundColor: 'transparent' },
  headerTitle: { fontSize: 17, lineHeight: 20, fontWeight: '900' },
  headerSubtitle: { color: c.muted, fontSize: 10, lineHeight: 13 },
  newChatButton: { flexDirection: 'row', alignItems: 'center', gap: 3, borderWidth: 1, borderColor: c.cardBorder, backgroundColor: c.card, borderRadius: 10, paddingHorizontal: 9, paddingVertical: 7 },
  newChatText: { color: c.primary, fontSize: 12, fontWeight: '800' },
  chatContainer: { flex: 1 },
  chatContent: { gap: 14, paddingHorizontal: 12, paddingTop: 16, paddingBottom: 20 },
  userMessage: { alignSelf: 'flex-end', maxWidth: '86%', backgroundColor: c.primary, borderRadius: 18, borderTopRightRadius: 5, paddingHorizontal: 14, paddingVertical: 10 },
  userMessageLabel: { color: c.onPrimaryMuted, fontSize: 8, lineHeight: 10, fontWeight: '900', letterSpacing: 0.8, marginBottom: 3 },
  userText: { color: c.onPrimary, fontWeight: '700', fontSize: 14, lineHeight: 20 },
  aiMessage: { width: '100%', backgroundColor: c.card, borderRadius: 20, borderWidth: 1, borderColor: c.cardBorder, overflow: 'hidden' },
  answerHeader: { minHeight: 62, flexDirection: 'row', alignItems: 'center', paddingHorizontal: 13, gap: 9, backgroundColor: 'transparent' },
  answerHeadingCopy: { flex: 1, backgroundColor: 'transparent' },
  answerEyebrow: { color: c.primary, fontSize: 8, lineHeight: 10, fontWeight: '900', letterSpacing: 0.8 },
  answerHeading: { fontSize: 15, lineHeight: 19, fontWeight: '900', marginTop: 2 },
  streamingLabel: { color: c.primary, fontSize: 8, fontWeight: '900', letterSpacing: 0.8 },
  lensTabs: { flexDirection: 'row', marginHorizontal: 12, borderRadius: 12, backgroundColor: c.inputBg, padding: 3 },
  lensTab: { flex: 1, minHeight: 34, borderRadius: 9, borderWidth: 1, borderColor: 'transparent', flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6 },
  lensDot: { width: 6, height: 6, borderRadius: 3 },
  lensTabText: { color: c.muted, fontSize: 12, fontWeight: '800' },
  answerBody: { minHeight: 116, paddingHorizontal: 15, paddingTop: 16, paddingBottom: 8, backgroundColor: 'transparent' },
  aiErrorText: { color: c.danger, fontWeight: '700' },
  loadingState: { minHeight: 90, alignItems: 'center', justifyContent: 'center', backgroundColor: 'transparent' },
  loadingText: { color: c.muted, fontSize: 12, marginTop: 8 },
  answerFooter: { flexDirection: 'row', alignItems: 'center', gap: 6, borderTopWidth: 1, borderTopColor: c.border, paddingHorizontal: 14, paddingVertical: 10, backgroundColor: 'transparent' },
  answerFooterText: { color: c.muted, fontSize: 10, lineHeight: 13 },
  loadingDot: { color: c.primary, fontSize: 14, fontWeight: '700' },
  loadingDotsContainer: { flexDirection: 'row', gap: 4, justifyContent: 'center', alignItems: 'center', backgroundColor: 'transparent' },
});

const makeMarkdownStyles = (c: Palette) => StyleSheet.create({
  body: { color: c.text, fontSize: 15, lineHeight: 23 },
  paragraph: { marginTop: 0, marginBottom: 11 },
  strong: { fontWeight: '800', color: c.text },
  em: { fontStyle: 'italic' },
  bullet_list: { marginBottom: 10 },
  ordered_list: { marginBottom: 10 },
  list_item: { marginBottom: 5 },
  blockquote: { backgroundColor: c.accentSoftBg, borderLeftColor: c.primary, borderLeftWidth: 3, paddingHorizontal: 11, paddingVertical: 6, borderRadius: 8 },
  code_inline: { backgroundColor: c.accentSoftBg, borderRadius: 4, paddingHorizontal: 4 },
  heading1: { fontSize: 18, fontWeight: '900', marginTop: 2, marginBottom: 7 },
  heading2: { fontSize: 17, fontWeight: '900', marginTop: 2, marginBottom: 7 },
  heading3: { fontSize: 15, fontWeight: '900', marginTop: 2, marginBottom: 6 },
});
