import AppTextInput from '@/components/app-text-input';
import ContentActions from '@/components/contentActions';
import ContentLongPress from '@/components/content-long-press';
import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { IconSymbol } from '@/components/ui/icon-symbol';
import UserAvatar from '@/components/user-avatar';
import DisplayName from '@/components/display-name';
import { type Palette } from '@/constants/theme';
import { useContentInteraction, useInteractionController, type InteractionVote } from '@/context/interactionContext';
import { usePalette } from '@/hooks/use-palette';
import { tapLight, tapMedium } from '@/lib/haptics';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { ActivityIndicator, Keyboard, Pressable, StyleSheet, View } from 'react-native';

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
	is_demo?: boolean;
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
	depth?: number;
	onLoadingChange?: (loading: boolean) => void;
	showLoadingIndicator?: boolean;
	refreshKey?: number; // bump to force a reload (e.g. after posting a comment)
};

export default function CommentList({
	postId,
	articleId,
	debateId,
	parentCommentId,
	initialPageSize = 10,
	indent = 0,
	depth = 0,
	onLoadingChange,
	showLoadingIndicator = true,
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

	useEffect(() => {
		onLoadingChange?.(loading);
	}, [loading, onLoadingChange]);

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
				<CommentItem
					key={c.id}
					comment={c}
					depth={depth}
					connectorWidth={indent}
				/>
			))}

			{error && (
				<ThemedText style={styles.error}>Error: {error}</ThemedText>
			)}

			{((loading && showLoadingIndicator) || (!loading && hasMore)) && (
				<View style={styles.actionsRow}>
					{loading && <ActivityIndicator />}
					{!loading && hasMore && (
						<Pressable
							accessibilityRole="button"
							onPress={() => { tapLight(); loadMore(); }}
							style={styles.button}
						>
							<ThemedText type="defaultSemiBold" style={styles.buttonText}>Load more</ThemedText>
						</Pressable>
					)}
				</View>
			)}
		</ThemedView>
	);
}

function CommentItem({
	comment,
	depth,
	connectorWidth,
}: {
	comment: Comment;
	depth: number;
	connectorWidth: number;
}) {
	const { c } = usePalette();
	const styles = useMemo(() => makeStyles(c), [c]);
	const [showReplies, setShowReplies] = useState(false);
	const [replyOpen, setReplyOpen] = useState(false);
	const [replyText, setReplyText] = useState('');
	const [replySubmitting, setReplySubmitting] = useState(false);
	const [replyRefresh, setReplyRefresh] = useState(0);
	const [repliesLoading, setRepliesLoading] = useState(false);
	const handleRepliesLoading = useCallback((loading: boolean) => setRepliesLoading(loading), []);
	const nextIndent = depth < 4 ? 26 : 0;
	const timeAgo = useRelativeTime(comment.created_at);
	const interactionController = useInteractionController();
	const { state: votes, getCurrent, patch, update } = useContentInteraction('comment', comment.id, {
		upvotes: comment.upvotes ?? 0,
		downvotes: comment.downvotes ?? 0,
		myVote: comment.my_vote ?? null,
		replyCount: comment.reply_count ?? 0,
		deleted: false,
	});

	// Optimistic vote state, reconciled with the server response
	const vote = async (direction: InteractionVote) => {
		tapLight();
		const prev = getCurrent();
		update((current) => {
			let upvotes = current.upvotes ?? 0;
			let downvotes = current.downvotes ?? 0;
			if (current.myVote === 'up') upvotes = Math.max(upvotes - 1, 0);
			if (current.myVote === 'down') downvotes = Math.max(downvotes - 1, 0);
			if (direction === 'up') upvotes += 1;
			if (direction === 'down') downvotes += 1;
			return { upvotes, downvotes, myVote: direction };
		});
		try {
			const res = await api<{ upvotes: number; downvotes: number; my_vote: InteractionVote }>(
				`/comments/${comment.id}/vote`,
				{ body: { direction } }
			);
			patch({ upvotes: res.upvotes, downvotes: res.downvotes, myVote: res.my_vote });
		} catch (e: any) {
			console.log('Error voting on comment:', e?.message);
			patch({ upvotes: prev.upvotes, downvotes: prev.downvotes, myVote: prev.myVote });
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
			update((current) => ({ replyCount: (current.replyCount ?? 0) + 1 }));
			if (comment.post_id) {
				interactionController.update('post', comment.post_id, (current) => ({
					commentCount: (current.commentCount ?? 0) + 1,
				}));
			} else if (comment.article_id) {
				interactionController.update('article', comment.article_id, (current) => ({
					commentCount: (current.commentCount ?? 0) + 1,
				}));
			}
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
	const replyCount = votes.replyCount ?? 0;
	const [hidden, setHidden] = useState(false);
	const handleDeleted = (result: {
		removed_comment_count?: number;
		post_id?: string | null;
		article_id?: string | null;
		parent_comment_id?: string | null;
	}) => {
		const removed = Math.max(1, result.removed_comment_count ?? 1);
		patch({ deleted: true });
		if (result.parent_comment_id) {
			interactionController.update('comment', result.parent_comment_id, (current) => ({
				replyCount: Math.max(0, (current.replyCount ?? 1) - 1),
			}));
		}
		if (result.post_id) {
			interactionController.update('post', result.post_id, (current) => ({
				commentCount: Math.max(0, (current.commentCount ?? removed) - removed),
			}));
		} else if (result.article_id) {
			interactionController.update('article', result.article_id, (current) => ({
				commentCount: Math.max(0, (current.commentCount ?? removed) - removed),
			}));
		}
	};

	if (hidden || votes.deleted) return null;

	return (
		<ContentLongPress
			preview={{
				kind: 'comment',
				id: comment.id,
				authorId: comment.user_id,
				authorName: comment.username,
				authorAvatar: comment.avatar_url,
				authorIsDemo: comment.is_demo,
				text: comment.content,
			}}
			onBlocked={() => setHidden(true)}
			onDeleted={handleDeleted}
		>
		<ThemedView style={[styles.comment, depth > 0 && styles.nestedComment]}>
			{showReplies && (
				<View
					pointerEvents="none"
					style={[
						styles.parentThreadSpine,
						{
							left: depth > 0 ? 13 : 15,
							top: depth > 0 ? 34 : 40,
						},
					]}
				/>
			)}
			<View style={styles.commentLayout}>
				{depth > 0 && connectorWidth > 0 && (
					<View
						pointerEvents="none"
						style={[
							styles.nestingConnector,
							{
								left: -(connectorWidth - (depth === 1 ? 15.5 : 13.5)),
								width: Math.max(4, connectorWidth - (depth === 1 ? 15.5 : 13.5)),
							},
						]}
					/>
				)}
				<UserAvatar
					userId={comment.user_id}
					avatarUrl={comment.avatar_url}
					isDemo={comment.is_demo}
					size={depth > 0 ? 27 : 31}
					accessibilityLabel={`Open ${comment.username ?? 'user'} profile`}
				/>
				<ThemedView style={styles.commentBody}>
					{/* Tapping only the avatar/name opens the author's profile. */}
					<ThemedView style={styles.header}>
						<ThemedView style={styles.commentIdentity}>
							<DisplayName
								username={comment.username}
								isDemo={comment.is_demo}
								nameStyle={styles.username}
							/>
							<ThemedText style={styles.timestamp}>{timeAgo}</ThemedText>
						</ThemedView>
						<ContentActions
							targetKind="comment"
							targetId={comment.id}
							authorId={comment.user_id}
							authorName={comment.username}
							onBlocked={() => setHidden(true)}
							onDeleted={handleDeleted}
						/>
					</ThemedView>

					<ThemedText style={styles.content}>{comment.content}</ThemedText>

					<View style={styles.commentActions}>
						<Pressable onPress={() => vote(isUpvoted ? null : 'up')} style={styles.actionButton} hitSlop={7}>
							<IconSymbol name={isUpvoted ? 'arrowshape.up.fill' : 'arrowshape.up'} size={16} color={isUpvoted ? c.voteUp : c.textMuted} />
							<ThemedText style={[styles.voteCount, isUpvoted && { color: c.voteUp }]}>{votes.upvotes ?? 0}</ThemedText>
						</Pressable>
						<Pressable onPress={() => vote(isDownvoted ? null : 'down')} style={styles.actionButton} hitSlop={7}>
							<IconSymbol name={isDownvoted ? 'arrowshape.down.fill' : 'arrowshape.down'} size={16} color={isDownvoted ? c.voteDown : c.textMuted} />
							<ThemedText style={[styles.voteCount, isDownvoted && { color: c.voteDown }]}>{votes.downvotes ?? 0}</ThemedText>
						</Pressable>
						<Pressable onPress={() => { tapLight(); setReplyOpen((open) => !open); }} style={styles.actionButton} hitSlop={7}>
							<IconSymbol name="bubble" size={15} color={c.muted} />
							<ThemedText style={styles.replyLabel}>Reply</ThemedText>
						</Pressable>
					</View>

					{replyOpen && (
						<AppTextInput
							placeholder={`Reply to ${comment.username ?? 'comment'}…`}
							value={replyText}
							onChangeText={setReplyText}
							multiline
							editable={!replySubmitting}
							autoFocus
							actionIcon="paperplane.fill"
							actionLabel="Post reply"
							actionDisabled={replySubmitting || !replyText.trim()}
							onAction={submitReply}
							containerStyle={styles.replyComposer}
						/>
					)}

					{replyCount > 0 && (
						<View style={styles.repliesControl}>
							<Pressable
								style={styles.repliesButton}
								onPress={() => { tapLight(); setShowReplies((shown) => !shown); }}
								hitSlop={6}
							>
								<ThemedText style={styles.repliesToggle}>
									{showReplies
										? 'Hide replies'
										: `View ${replyCount} ${replyCount === 1 ? 'reply' : 'replies'}`}
								</ThemedText>
							</Pressable>
							{showReplies && repliesLoading && (
								<ActivityIndicator size="small" color={c.primary} />
							)}
						</View>
					)}
				</ThemedView>
			</View>

			{showReplies && (
				<CommentList
					parentCommentId={comment.id}
					initialPageSize={8}
					indent={nextIndent}
					depth={depth + 1}
					onLoadingChange={handleRepliesLoading}
					showLoadingIndicator={false}
					refreshKey={replyRefresh}
				/>
			)}
		</ThemedView>
		</ContentLongPress>
	);
}

const makeStyles = (c: Palette) => StyleSheet.create({
	container: {
		gap: 2,
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
		paddingVertical: 9,
		position: 'relative',
	},
	nestedComment: {
		paddingVertical: 7,
	},
	commentLayout: {
		flexDirection: 'row',
		alignItems: 'flex-start',
		gap: 10,
		position: 'relative',
	},
	nestingConnector: {
		position: 'absolute',
		top: 4,
		height: 10,
		borderLeftWidth: 1,
		borderBottomWidth: 1,
		borderBottomLeftRadius: 7,
		borderColor: c.border,
	},
	parentThreadSpine: {
		position: 'absolute',
		bottom: 12,
		width: 1,
		borderRadius: 1,
		backgroundColor: c.border,
	},
	commentBody: {
		flex: 1,
		minWidth: 0,
		gap: 6,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		minHeight: 24,
	},
	commentIdentity: {
		flex: 1,
		flexDirection: 'row',
		alignItems: 'baseline',
		flexWrap: 'wrap',
		columnGap: 6,
	},
	username: {
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
		lineHeight: 20,
	},
	commentActions: {
		flexDirection: 'row',
		gap: 18,
		alignItems: 'center',
		minHeight: 22,
	},
	actionButton: {
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
		fontWeight: '700',
	},
	repliesButton: {
		alignSelf: 'flex-start',
		paddingVertical: 2,
	},
	repliesControl: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 7,
		minHeight: 24,
	},
	replyComposer: {
		marginTop: 2,
	},
});
