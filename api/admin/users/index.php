<?php
$admin = Auth::requireAdmin();
$users = Database::query('SELECT id, email, display_name, organization_id, role, status, created_at FROM users ORDER BY created_at DESC')->fetchAll();
Response::success($users);
