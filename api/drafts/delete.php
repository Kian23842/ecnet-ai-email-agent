<?php
$user    = Auth::requireAuth();
$orgId   = $user['organization_id'];
$draftId = $_GET['id'] ?? '';

$draft = Database::query('SELECT * FROM drafts WHERE id = ? AND organization_id = ?', [$draftId, $orgId])->fetch();
if (!$draft) Response::error('Draft not found', 404);

Database::query('DELETE FROM drafts WHERE id = ?', [$draftId]);
Response::success(null, 'Draft deleted');
