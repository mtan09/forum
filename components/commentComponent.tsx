import { ThemedText } from '@/components/themed-text';
import { ThemedView } from '@/components/themed-view';
import { useRelativeTime } from '@/hooks/useRelativeTime';
import { supabase } from '@/lib/supabaseClient';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ActivityIndicator, Image, Pressable, StyleSheet, View } from 'react-native';

type Comment = {
	id: string;
	user_id: string;
	post_id: string;
	parent_comment_id: string | null;
	content: string;
	created_at: string;
};

type UserProfile = {
	id: string;
	username: string;
	avatar_url?: string | null;
};

type CommentListProps = {
	postId?: string;
	parentCommentId?: string;
	initialPageSize?: number;
	indent?: number; // pixels to indent nested levels
};

// Small cache in memory for user profiles during the session of this component tree
const useUserCache = () => {
	const [cache, setCache] = useState<Record<string, UserProfile>>({});
	const setMany = (users: UserProfile[]) => {
		setCache((prev) => {
			const next = { ...prev };
			for (const u of users) next[u.id] = u;
			return next;
		});
	};
	const setOne = (user: UserProfile) => setMany([user]);
	return { cache, setMany, setOne };
};

export default function CommentList({
	postId,
	parentCommentId,
	initialPageSize = 10,
	indent = 0,
}: CommentListProps) {
	const [comments, setComments] = useState<Comment[]>([]);
	const [loading, setLoading] = useState(false);
	const [error, setError] = useState<string | null>(null);
	const [page, setPage] = useState(0);
	const [hasMore, setHasMore] = useState(true);
	const pageSize = initialPageSize;

	const { cache: userCache, setMany: cacheUsers } = useUserCache();

		// Track which pages have already been loaded to avoid duplicate fetch/append (e.g., React StrictMode double effects)
		const loadedKeysRef = useRef<Set<string>>(new Set());

	const filterDesc = useMemo(() => {
		if (parentCommentId) return { type: 'reply', value: parentCommentId } as const;
		return { type: 'post', value: postId! } as const;
	}, [postId, parentCommentId]);

	const fetchUsersForComments = useCallback(async (list: Comment[]) => {
		const missingUserIds = Array.from(
			new Set(list.map((c) => c.user_id).filter((id) => !userCache[id]))
		);
		if (missingUserIds.length === 0) return;
		const { data, error } = await supabase
			.from('userdata')
			.select('id, username, avatar_url')
			.in('id', missingUserIds);
		if (!error && data) {
			cacheUsers(data as unknown as UserProfile[]);
		}
	}, [userCache, cacheUsers]);

		const loadPage = useCallback(async () => {
		if (!postId && !parentCommentId) return;
			const key = `${parentCommentId ? 'reply' : 'post'}:${parentCommentId ?? postId}:${page}`;
			if (loadedKeysRef.current.has(key)) return; // already loaded this page for this target
		setLoading(true);
		setError(null);
		try {
			const from = page * pageSize;
			const to = from + pageSize - 1;
			let query = supabase
				.from('comments')
				.select('*', { count: 'exact' })
				.order('created_at', { ascending: true });

			if (parentCommentId) {
				query = query.eq('parent_comment_id', parentCommentId);
			} else if (postId) {
				query = query.eq('post_id', postId).is('parent_comment_id', null);
			}

					const { data, error, count } = await query.range(from, to);
			if (error) throw error;
			const fetched = (data || []) as Comment[];
					// Deduplicate by id in case effects run twice or backend returns duplicates
					setComments((prev) => {
						const map = new Map<string, Comment>();
						for (const c of prev) map.set(c.id, c);
						for (const c of fetched) map.set(c.id, c);
						return Array.from(map.values());
					});
			setHasMore(typeof count === 'number' ? prevHasMore(from, to, count) : fetched.length === pageSize);

			// Warm user cache
			await fetchUsersForComments(fetched);

					// mark this page as loaded
					loadedKeysRef.current.add(key);
		} catch (e: any) {
			setError(e.message ?? 'Failed to load comments');
		} finally {
			setLoading(false);
		}
	}, [page, pageSize, postId, parentCommentId, fetchUsersForComments]);

	useEffect(() => {
		// Reset when target changes
		setComments([]);
		setPage(0);
		setHasMore(true);
			loadedKeysRef.current.clear();
	}, [filterDesc]);

	useEffect(() => {
		loadPage();
	}, [page, loadPage]);

	if (!postId && !parentCommentId) return null;

	return (
		<ThemedView style={[styles.container, indent ? { marginLeft: indent } : undefined]}>      
			{comments.length === 0 && !loading && !error && (
				<ThemedText style={styles.empty}>No comments yet.</ThemedText>
			)}

			{comments.map((c) => (
				<CommentItem key={c.id} comment={c} user={userCache[c.user_id]} />
			))}

			{error && (
				<ThemedText style={styles.error}>Error: {error}</ThemedText>
			)}

			<View style={styles.actionsRow}>
				{loading && <ActivityIndicator />}
				{!loading && hasMore && (
					<Pressable
						accessibilityRole="button"
						onPress={() => setPage((p) => p + 1)}
						style={styles.button}
					>
						<ThemedText type="defaultSemiBold" style={styles.buttonText}>Load more</ThemedText>
					</Pressable>
				)}
			</View>
		</ThemedView>
	);
}

function prevHasMore(from: number, to: number, count: number) {
	return to < count - 1;
}

function CommentItem({ comment, user }: { comment: Comment; user?: UserProfile }) {
	const [showReplies, setShowReplies] = useState(false);
	const [replyCount, setReplyCount] = useState<number | null>(null);
	const timeAgo = useRelativeTime(comment.created_at);

	useEffect(() => {
		// Fetch reply count to decide showing the toggle lazily
		const fetchCount = async () => {
			const { count } = await supabase
				.from('comments')
				.select('*', { count: 'exact', head: true })
				.eq('parent_comment_id', comment.id);
			if (typeof count === 'number') setReplyCount(count);
		};
		fetchCount();
	}, [comment.id]);

	return (
		<ThemedView style={styles.comment}>
			<ThemedView style={styles.header}>
				<Image
					source={user?.avatar_url ? { uri: user.avatar_url } : require('@/assets/images/Default_pfp.jpg')}
					style={styles.avatar}
				/>
				<ThemedView style={{ flex: 1 }}>
					<ThemedText type="defaultSemiBold" style={styles.username}>{user?.username ?? 'Anonymous'}</ThemedText>
					<ThemedText style={styles.timestamp}>{timeAgo}</ThemedText>
				</ThemedView>
			</ThemedView>

			<ThemedText style={styles.content}>{comment.content}</ThemedText>

			<View style={styles.commentActions}>
				{replyCount !== null && replyCount > 0 && !showReplies && (
					<Pressable style={styles.inlineButton} onPress={() => setShowReplies(true)}>
						<ThemedText type="link">Load replies ({replyCount})</ThemedText>
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

