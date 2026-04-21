<?php
$admin  = Auth::requireAdmin();
$userId = $_GET['id'] ?? '';
$user   = Database::query('SELECT id FROM users WHERE id = ?', [$userId])->fetch();
if (!$user) Response::error('User not found', 404);
Database::query('DELETE FROM users WHERE id = ?', [$userId]);
Response::success(null, 'User deleted');
