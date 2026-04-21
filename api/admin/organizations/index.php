<?php
$admin = Auth::requireAdmin();
$orgs  = Database::query('SELECT o.*, COUNT(u.id) as user_count FROM organizations o LEFT JOIN users u ON u.organization_id = o.id GROUP BY o.id ORDER BY o.created_at DESC')->fetchAll();
Response::success($orgs);
