<?php
$admin  = Auth::requireAdmin();
$userId = $_GET['id'] ?? '';
$body   = json_decode(file_get_contents('php://input'), true) ?? [];
$user   = Database::query('SELECT * FROM users WHERE id = ?', [$userId])->fetch();
if (!$user) Response::error('User not found', 404);
$updates = []; $params = [];
foreach (['display_name','organization_id','role','status'] as $f) {
    if (isset($body[$f])) { $updates[] = "{$f} = ?"; $params[] = $body[$f]; }
}
if (isset($body['password'])) { $updates[] = 'password_hash = ?'; $params[] = Auth::hashPassword($body['password']); }
if (!$updates) Response::error('Nothing to update');
$params[] = $userId;
Database::query('UPDATE users SET ' . implode(', ', $updates) . ' WHERE id = ?', $params);
Response::success(null, 'User updated');
