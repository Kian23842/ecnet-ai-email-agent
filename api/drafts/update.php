<?php
$user    = Auth::requireAuth();
$orgId   = $user['organization_id'];
$draftId = $_GET['id'] ?? '';
$body    = json_decode(file_get_contents('php://input'), true) ?? [];

$draft = Database::query('SELECT * FROM drafts WHERE id = ? AND organization_id = ?', [$draftId, $orgId])->fetch();
if (!$draft) Response::error('Draft not found', 404);

$allowed = ['draft_text', 'status'];
$updates = [];
$params  = [];
foreach ($allowed as $field) {
    if (isset($body[$field])) { $updates[] = "{$field} = ?"; $params[] = $body[$field]; }
}
if (!$updates) Response::error('No valid fields to update');
$params[] = $draftId;
Database::query('UPDATE drafts SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
Response::success(null, 'Draft updated');
