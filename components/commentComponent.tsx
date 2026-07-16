import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { api } from '@/lib/api';
import React, { useCallback, useEffect, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

export type Comment = {
	id: string;
	user_id: string;
	post_id: string;
	parent_comment_id: string | null;
	content: string;
	created_at: string;
	// joined in by the API
	username: string;
	avatar_url?: string | null;
	reply_count: number;
};

type CommentListProps = {
	postId?: string;
	parentCommentId?: string;
	initialPageSize?: number;
	indent?: number; // pixels to indent nested levels
	refreshKey?: number; // bump to force a reload (e.g. after posting a comment)
};

export default function CommentList({
	postId,
	parentCommentId,
	initialPageSize = 10,
	indent = 0,
	refreshKey = 0,
}: CommentListProps) {
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const pageSize = initialPageSize;

	const loadPage = useCallback(async (pageToLoad: number, replace: boolean) => {
		if (!postId && !parentCommentId) return;
		setLoading(true);
		setError(null);
		try {
			const filter = parentCommentId
				? `parent_comment_id=${parentCommentId}`
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
	}, [postId, parentCommentId, pageSize]);

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

	if (!postId && !parentCommentId) return null;

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

function CommentItem({ comment }: { comment: Comment }) {
	const [showReplies, setShowReplies] = useState(false);
	const timeAgo = useRelativeTime(comment.created_at);

	return (
		<ThemedView style={styles.comment}>
			<ThemedView style={styles.header}>
				<Image
					source={comment.avatar_url ? { uri: comment.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
					style={styles.avatar}
				/>
				<ThemedView style={{ flex: 1 }}>
					<ThemedText type="defaultSemiBold" style={styles.username}>{comment.username ?? 'Anonymous'}</ThemedText>
					<ThemedText style={styles.timestamp}>{timeAgo}</ThemedText>
				</ThemedView>
			</ThemedView>

			<ThemedText style={styles.content}>{comment.content}</ThemedText>

			<View style={styles.commentActions}>
				{comment.reply_count > 0 && !showReplies && (
					<Pressable style={styles.inlineButton} onPress={() => setShowReplies(true)}>
						<ThemedText type="link">Load replies ({comment.reply_count})</ThemedText>
					</Pressable>
				)}
				{showReplies && (
					<Pressable style={styles.inlineButton} onPress={() => setShowReplies(false)}>
						<ThemedText type="link">Hide replies</ThemedText>
					</Pressable>
				)}
			</View>

			{showReplies && (
				<CommentList parentCommentId={comment.id} initialPageSize={5} indent={16} />
			)}
		</ThemedView>
	);
}

const styles = StyleSheet.create({
	container: {
		gap: 8,
	},
	empty: {
		color: '#8D8D8D',
		fontStyle: 'italic',
	},
	error: {
		color: '#ff4d4f',
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
		borderColor: '#c6c6c6ff',
	},
	buttonText: {
		fontWeight: '600',
    color: '#592EDC',
	},
	comment: {
		borderLeftWidth: 2,
		borderLeftColor: '#e5e5e5',
		paddingLeft: 8,
		gap: 6,
	},
	header: {
		flexDirection: 'row',
		alignItems: 'center',
		gap: 8,
	},
	avatar: {
		width: 28,
		height: 28,
		borderRadius: 12,
	},
	username: {
		fontSize: 14,
		fontWeight: '700',
	},
	timestamp: {
		color: '#8D8D8D',
		fontSize: 12,
	},
	content: {
		fontSize: 15,
	},
	commentActions: {
		flexDirection: 'row',
		gap: 12,
		alignItems: 'center',
	},
	inlineButton: {
		paddingVertical: 2,
	},
});
