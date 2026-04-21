<?php
$admin = Auth::requireAdmin();
$orgId = $_GET['orgId'] ?? '';
Database::query('DELETE FROM gcp_configs WHERE organization_id = ?', [$orgId]);
Response::success(null, 'GCP configuration deleted');
