import PostInteractionsGeneric from './post-interactions-generic'

type Reaction = { id: string; emoji: string; user_id: string; profiles?: { username: string } }
type Comment = { id: string; content: string; user_id: string; created_at: string; profiles?: { username: string } }

export default function PostInteractions({
  eventId,
  userId,
  initialReactions,
  initialComments,
}: {
  eventId: string
  userId: string
  initialReactions: Reaction[]
  initialComments: Comment[]
}) {
  return (
    <PostInteractionsGeneric
      postId={eventId}
      userId={userId}
      initialReactions={initialReactions}
      initialComments={initialComments}
      table="feed"
    />
  )
}
