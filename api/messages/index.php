<?php
$user   = Auth::requireAuth();
$orgId  = $user['organization_id'];
$limit  = min((int)($_GET['limit'] ?? 50), 100);
$offset = (int)($_GET['offset'] ?? 0);

$messages = Database::query('
    SELECT m.*,
           c.category, c.urgency, c.sentiment, c.summary, c.requires_human_review,
           d.id as draft_id, d.status as draft_status, d.draft_text
    FROM messages m
    LEFT JOIN classifications c ON c.message_id = m.id AND c.organization_id = m.organization_id
    LEFT JOIN drafts d ON d.message_id = m.id AND d.organization_id = m.organization_id
    WHERE m.organization_id = ?
    ORDER BY m.received_at DESC
    LIMIT ? OFFSET ?
', [$orgId, $limit, $offset])->fetchAll();

$total = (int)Database::query(
    'SELECT COUNT(*) FROM messages WHERE organization_id = ?', [$orgId]
)->fetchColumn();

Response::success(['messages' => $messages, 'total' => $total, 'limit' => $limit, 'offset' => $offset]);
