import ContentActions from '@/components/contentActions';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import { type Palette } from '@/constants/theme';
import { usePalette } from '@/hooks/use-palette';
import { tapLight, tapMedium } from '@/lib/haptics';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import { useRouter } from 'expo-router';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Image, Keyboard, Pressable, StyleSheet, TextInput, View } from 'react-native';

export type Comment = {
	id: string;
	user_id: string;
	post_id: string | null;
	article_id: string | null;
	parent_comment_id: string | null;
	content: string;
	created_at: string;
	upvotes: number;
	downvotes: number;
	// joined in by the API
	username: string;
	avatar_url?: string | null;
	my_vote?: 'up' | 'down' | null;
	reply_count: number;
};

type CommentListProps = {
	postId?: string;
	articleId?: string;
	debateId?: string;
	parentCommentId?: string;
	initialPageSize?: number;
	indent?: number; // pixels to indent nested levels
	refreshKey?: number; // bump to force a reload (e.g. after posting a comment)
};

export default function CommentList({
	postId,
	articleId,
	debateId,
	parentCommentId,
	initialPageSize = 10,
	indent = 0,
	refreshKey = 0,
}: CommentListProps) {
	const { c } = usePalette();
	const styles = useMemo(() => makeStyles(c), [c]);
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const pageSize = initialPageSize;

	const loadPage = useCallback(async (pageToLoad: number, replace: boolean) => {
		if (!postId && !articleId && !debateId && !parentCommentId) return;
		setLoading(true);
		setError(null);
		try {
			const filter = parentCommentId
				? `parent_comment_id=${parentCommentId}`
				: debateId
					? `debate_id=${debateId}`
					: articleId
						? `article_id=${articleId}`
						: `post_id=${postId}`;
			const data = await api<{ comments: Comment[]; hasMore: boolean }>(
				`/comments?${filter}&page=${pageToLoad}&limit=${pageSize}`
			);
			setComments((prev) => {
				const base = replace ? [] : prev;
				const map = new Map<string, Comment>();
				for (const c of base) map.set(c.id, c);
				for (const c of data.comments) map.set(c.id, c);
				return Array.from(map.values());
			});
			setHasMore(data.hasMore);
		} catch (e: any) {
			setError(e.message ?? 'Failed to load comments');
		} finally {
			setLoading(false);
		}
	}, [postId, articleId, debateId, parentCommentId, pageSize]);

	// Reset and reload when the target (or refreshKey) changes
	useEffect(() => {
		setPage(0);
		loadPage(0, true);
	}, [loadPage, refreshKey]);

	const loadMore = () => {
		const next = page + 1;
		setPage(next);
		loadPage(next, false);
	};

	if (!postId && !articleId && !debateId && !parentCommentId) return null;

	return (
		<ThemedView style={[styles.container, indent ? { marginLeft: indent } : undefined]}>
			{comments.length === 0 && !loading && !error && (
				<ThemedText style={styles.empty}>No comments yet.</ThemedText>
			)}

			{comments.map((c) => (
				<CommentItem key={c.id} comment={c} />
			))}

			{error && (
				<ThemedText style={styles.error}>Error: {error}</ThemedText>
			)}

			<View style={styles.actionsRow}>
				{loading && <ActivityIndicator />}
				{!loading && hasMore && (
					<Pressable
						accessibilityRole="button"
						onPress={loadMore}
						style={styles.button}
					>
						<ThemedText type="defaultSemiBold" style={styles.buttonText}>Load more</ThemedText>
					</Pressable>
				)}
			</View>
		</ThemedView>
	);
}

type VoteDirection = 'up' | 'down' | null;

function CommentItem({ comment }: { comment: Comment }) {
	const { c } = usePalette();
	const styles = useMemo(() => makeStyles(c), [c]);
	const [showReplies, setShowReplies] = useState(false);
	const [replyOpen, setReplyOpen] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [replySubmitting, setReplySubmitting] = useState(false);
	const [replyRefresh, setReplyRefresh] = useState(0);
	const [replyCount, setReplyCount] = useState(comment.reply_count);
	const router = useRouter();
	const timeAgo = useRelativeTime(comment.created_at);

	// Optimistic vote state, reconciled with the server response
	const [votes, setVotes] = useState<{ up: number; down: number; myVote: VoteDirection }>({
		up: comment.upvotes ?? 0,
		down: comment.downvotes ?? 0,
		myVote: comment.my_vote ?? null,
	});

	const applyVote = (prev: typeof votes, direction: VoteDirection) => {
		let { up, down } = prev;
		if (prev.myVote === 'up') up = Math.max(up - 1, 0);
		if (prev.myVote === 'down') down = Math.max(down - 1, 0);
		if (direction === 'up') up += 1;
		if (direction === 'down') down += 1;
		return { up, down, myVote: direction };
	};

	const vote = async (direction: VoteDirection) => {
		tapLight();
		const prev = votes;
		setVotes(applyVote(prev, direction));
		try {
			const res = await api<{ upvotes: number; downvotes: number; my_vote: VoteDirection }>(
				`/comments/${comment.id}/vote`,
				{ body: { direction } }
			);
			setVotes({ up: res.upvotes, down: res.downvotes, myVote: res.my_vote });
		} catch (e: any) {
			console.log('Error voting on comment:', e?.message);
			setVotes(prev);
		}
	};

	const submitReply = async () => {
		const content = replyText.trim();
		if (!content || replySubmitting) return;
		try {
			tapMedium();
			setReplySubmitting(true);
			await api('/comments', { body: { parent_comment_id: comment.id, content } });
			setReplyText('');
			setReplyOpen(false);
			setReplyCount((n) => n + 1);
			setShowReplies(true);
			setReplyRefresh((k) => k + 1);
			Keyboard.dismiss();
		} catch (e: any) {
			console.log('Error posting reply:', e?.message);
		} finally {
			setReplySubmitting(false);
		}
	};

	const isUpvoted = votes.myVote === 'up';
	const isDownvoted = votes.myVote === 'down';
	const [hidden, setHidden] = useState(false);

	if (hidden) return null;

	return (
		<ThemedView style={styles.comment}>
			{/* Header: avatar + username · time on one line; tapping the
			    identity opens the author's public profile */}
			<ThemedView style={styles.header}>
				<Pressable
					onPress={() => router.push(`/user/${comment.user_id}`)}
					style={({ pressed }) => ({ opacity: pressed ? 0.6 : 1.0 })}
				>
					<Image
						source={comment.avatar_url ? { uri: comment.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
						style={styles.avatar}
					/>
				</Pressable>
				<ThemedText type="defaultSemiBold" style={styles.username} numberOfLines={1}>
					{comment.username ?? 'Anonymous'}
					<ThemedText style={styles.timestamp}>{'   ·   '}{timeAgo}</ThemedText>
				</ThemedText>
				<ContentActions
					targetKind="comment"
					targetId={comment.id}
					authorId={comment.user_id}
					authorName={comment.username}
					onBlocked={() => setHidden(true)}
				/>
			</ThemedView>

			<ThemedText style={styles.content}>{comment.content}</ThemedText>

			{/* Actions: votes, reply, replies toggle */}
			<View style={styles.commentActions}>
				<Pressable onPress={() => vote(isUpvoted ? null : 'up')} style={styles.voteButton}>
					<IconSymbol name={isUpvoted ? 'arrowshape.up.fill' : 'arrowshape.up'} size={16} color={isUpvoted ? c.voteUp : c.textMuted} />
					<ThemedText style={[styles.voteCount, isUpvoted && { color: c.voteUp }]}>{votes.up}</ThemedText>
				</Pressable>
				<Pressable onPress={() => vote(isDownvoted ? null : 'down')} style={styles.voteButton}>
					<IconSymbol name={isDownvoted ? 'arrowshape.down.fill' : 'arrowshape.down'} size={16} color={isDownvoted ? c.voteDown : c.textMuted} />
					<ThemedText style={[styles.voteCount, isDownvoted && { color: c.voteDown }]}>{votes.down}</ThemedText>
				</Pressable>
				<Pressable onPress={() => setReplyOpen((o) => !o)} style={styles.voteButton}>
					<IconSymbol name="bubble" size={15} color={c.muted} />
					<ThemedText style={styles.replyLabel}>Reply</ThemedText>
				</Pressable>
				{replyCount > 0 && (
					<Pressable style={styles.voteButton} onPress={() => setShowReplies((s) => !s)}>
						<ThemedText style={styles.repliesToggle}>
							{showReplies ? 'Hide replies' : `Replies (${replyCount})`}
						</ThemedText>
					</Pressable>
				)}
			</View>

			{/* Inline reply composer */}
			{replyOpen && (
				<View style={styles.replyComposer}>
					<TextInput
						placeholder={`Reply to ${comment.username ?? 'comment'}...`}
						placeholderTextColor={c.muted}
						value={replyText}
						onChangeText={setReplyText}
						multiline
						numberOfLines={1}
						style={styles.replyInput}
						editable={!replySubmitting}
						autoFocus
					/>
					<Pressable onPress={submitReply} disabled={replySubmitting || !replyText.trim()}>
						<IconSymbol
							name="arrow.up.circle.fill"
							size={24}
							color={replyText.trim() && !replySubmitting ? c.primary : c.primaryDisabled}
						/>
					</Pressable>
				</View>
			)}

			{/* Nested replies */}
			{showReplies && (
				<CommentList parentCommentId={comment.id} initialPageSize={5} indent={16} refreshKey={replyRefresh} />
			)}
		</ThemedView>
	);
}

const makeStyles = (c: Palette) => StyleSheet.create({
	container: {
		gap: 8,
	},
	empty: {
		color: c.muted,
		fontStyle: 'italic',
	},
	error: {
		color: c.danger,
	},
	actionsRow: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 12,
		paddingVertical: 4,
	},
	button: {
		paddingHorizontal: 12,
		paddingVertical: 8,
		borderRadius: 12,
		borderWidth: 1,
		borderColor: c.border,
	},
	buttonText: {
		fontWeight: '600',
    color: c.primary,
	},
	comment: {
		borderLeftWidth: 2,
		borderLeftColor: c.border,
		paddingLeft: 10,
		gap: 6,
		paddingVertical: 2,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	avatar: {
		width: 28,
		height: 28,
		borderRadius: 14,
	},
	username: {
		flex: 1,
		fontSize: 14,
		fontWeight: '700',
	},
	timestamp: {
		color: c.muted,
		fontSize: 12,
		fontWeight: '400',
	},
	content: {
		fontSize: 15,
	},
	commentActions: {
		flexDirection: 'row',
		gap: 16,
		alignItems: 'center',
	},
	voteButton: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 4,
	},
	voteCount: {
		fontSize: 13,
		color: c.muted,
	},
	replyLabel: {
		fontSize: 13,
		color: c.muted,
		fontWeight: '600',
	},
	repliesToggle: {
		fontSize: 13,
		color: c.primary,
		fontWeight: '600',
	},
	replyComposer: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
		borderColor: c.accentFaint,
		borderWidth: 1.5,
		borderRadius: 12,
		paddingHorizontal: 10,
		paddingVertical: 6,
	},
	replyInput: {
		flex: 1,
		fontSize: 14,
		lineHeight: 19,
		minHeight: 27,
		maxHeight: 80,
		paddingTop: 4,
		paddingBottom: 4,
		textAlignVertical: 'center',
		color: c.text,
	},
});
