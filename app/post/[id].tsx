import CommentList from '@/components/commentComponent';
import Post from '@/components/postComponent';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { usePosts } from '@/context/postContext';
import { useLocalSearchParams } from 'expo-router';
import { useState } from 'react';
import { Dimensions, ScrollView, StyleSheet } from 'react-native';

const screenWidth = Dimensions.get('window').width;

export default function PostScreen() {
  const { id } = useLocalSearchParams();
  const { posts, setPosts, handleUpvote, handleUnUpvote, handleDownvote, handleUnDownvote } = usePosts();
  
  const post = posts.find(p => p.id === id);

  if (!post) return null;

  const [openClaims, setOpenClaims] = useState<Record<string, boolean>>({});
  
  const toggleClaim = (claimId: string) => {
    setOpenClaims(prev => ({
      ...prev,
      [claimId]: !prev[claimId]
    }));
  };

  const claims = [
    { id: '1', text: 'Lorem ipsum dolor...', verdict: true, evidence: "AAA data shows average price was $3.89 nationwide.", sources: ['AAA', 'Reuters'], confidence: 0.91},
    { id: '2', text: 'Consectetur adipiscing...', verdict: false, evidence: "BBB data shows average price was $2.89 nationwide.", sources: ['BBB', 'AP'], confidence: 0.85},
  ];

  return (
    <ScrollView>
      <Post 
        post={post}
      />
      <ThemedView style={styles.container}>
        {/* <ThemedView style={styles.factCheck}>
          <ThemedText type="defaultSemiBold" style={{ fontWeight: "800" }}>
            Fact Check
          </ThemedText>

          <ThemedView style={styles.claims}>
            {claims.map(claim=> (
              <ThemedView key={claim.id} style={styles.claim}>
                <Pressable
                  onPress={() => toggleClaim(claim.id)}
                >
                  <ThemedView style={styles.header}>
                    <IconSymbol name={openClaims[claim.id] ? "chevron.down" : "chevron.right"} size={20} color="#592EDC" />
                    <ThemedText>Claim: {claim.text}</ThemedText>
                  </ThemedView>
                </Pressable>
                {openClaims[claim.id] && (
                  <ThemedView style={styles.dropdown}>
                    <ThemedText>Verdict: {claim.verdict ? '✅ True' : '❌ False'}</ThemedText>
                    {claim.evidence && <ThemedText>🔍 Evidence: {claim.evidence}</ThemedText>}
                    {claim.sources && <ThemedText>Sources: {claim.sources.join(', ')}</ThemedText>}
                    {claim.confidence !== undefined && <ThemedText>📊 Confidence: {(claim.confidence * 100).toFixed(1)}%</ThemedText>}
                  </ThemedView>
                )}
              </ThemedView>
            ))}
          </ThemedView>
        </ThemedView> */}

        {/* <ThemedView style={styles.biggerPicture}>
          <ThemedText type="defaultSemiBold" style={{ fontWeight: "800"}}>
            Here's the bigger picture:
          </ThemedText>
          <ThemedText>
            Israel and Hamas agreed to a ceasefire involving hostage and prisoner exchanges, partial Israeli troop withdrawals, and increased humanitarian aid to Gaza, though key issues like Hamas’s disarmament and Gaza’s future governance remain unresolved.
          </ThemedText>
        </ThemedView> */}

        {/* Comments */}
        <ThemedView style={{ marginTop: 8 }}>
          <ThemedText type="defaultSemiBold" style={{ fontWeight: '800', marginBottom: 8 }}>Comments</ThemedText>
          <CommentList postId={post.id} />
        </ThemedView>
      </ThemedView>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 16,
    gap: 12,
  },
  factCheck: {
    gap: 8,
  },
  claims: {
    gap: 8,
  },
  claim: {
    gap: 4,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  biggerPicture: {
    backgroundColor: "#BAA8F0",
    borderRadius: 16,
    padding: 16,
  },
  dropdown: {
    width: screenWidth - 60,
    marginLeft: 28,
    borderLeftColor: '#BAA8F0',
    borderLeftWidth: 2,
    paddingLeft: 8,
  }
});