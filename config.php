<?php
define('DB_HOST', 'localhost');
define('DB_NAME', 'chess_pro');
define('DB_USER', 'root');
define('DB_PASS', '');

function get_db_connection() {
    static $pdo = null;
    static $attempted = false;

    if ($pdo !== null) return $pdo;
    if ($attempted) return null;
    $attempted = true;

    try {
        $pdo = new PDO(
            'mysql:host=' . DB_HOST . ';dbname=' . DB_NAME . ';charset=utf8mb4',
            DB_USER,
            DB_PASS,
            [
                PDO::ATTR_ERRMODE => PDO::ERRMODE_EXCEPTION,
                PDO::ATTR_DEFAULT_FETCH_MODE => PDO::FETCH_ASSOC,
            ]
        );
        return $pdo;
    } catch (Exception $e) {
        $pdo = null;
        return null;
    }
}