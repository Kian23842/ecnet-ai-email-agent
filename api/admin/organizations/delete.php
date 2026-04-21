<?php
$admin = Auth::requireAdmin();
$orgId = $_GET['id'] ?? '';
$org   = Database::query('SELECT id FROM organizations WHERE id = ?', [$orgId])->fetch();
if (!$org) Response::error('Organization not found', 404);
Database::query('DELETE FROM organizations WHERE id = ?', [$orgId]); // CASCADE deletes all related data
Response::success(null, 'Organization deleted');
