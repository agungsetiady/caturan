<?php
header('Content-Type: application/json; charset=utf-8');
require_once __DIR__ . '/config.php';

$action = $_GET['action'] ?? $_POST['action'] ?? '';
$pdo = get_db_connection();

function respond($data, $code = 200) {
    http_response_code($code);
    echo json_encode($data);
    exit;
}

if (!$pdo) {
    respond(['ok' => false, 'db' => false, 'message' => 'Database tidak aktif, hasil hanya tersimpan lokal di browser.']);
}

switch ($action) {
    case 'save_result': {
        $raw = file_get_contents('php://input');
        $body = json_decode($raw, true) ?: $_POST;

        $name = trim($body['player_name'] ?? 'Anonim');
        $name = mb_substr($name === '' ? 'Anonim' : $name, 0, 60);
        $mode = in_array($body['mode'] ?? '', ['pvp', 'ai']) ? $body['mode'] : 'pvp';
        $difficulty = isset($body['difficulty']) ? mb_substr($body['difficulty'], 0, 20) : null;
        $result = in_array($body['result'] ?? '', ['win', 'loss', 'draw']) ? $body['result'] : 'draw';
        $movesCount = (int)($body['moves_count'] ?? 0);
        $duration = (int)($body['duration_seconds'] ?? 0);
        $pgn = $body['pgn'] ?? '';

        try {
            $stmt = $pdo->prepare(
                'INSERT INTO matches (player_name, mode, difficulty, result, moves_count, duration_seconds, pgn)
                 VALUES (:name, :mode, :difficulty, :result, :moves, :duration, :pgn)'
            );
            $stmt->execute([
                ':name' => $name,
                ':mode' => $mode,
                ':difficulty' => $difficulty,
                ':result' => $result,
                ':moves' => $movesCount,
                ':duration' => $duration,
                ':pgn' => $pgn,
            ]);

            $col = $result === 'win' ? 'wins' : ($result === 'loss' ? 'losses' : 'draws');
            $upsert = $pdo->prepare(
                "INSERT INTO leaderboard (player_name, $col) VALUES (:name, 1)
                 ON DUPLICATE KEY UPDATE $col = $col + 1"
            );
            $upsert->execute([':name' => $name]);

            respond(['ok' => true, 'db' => true]);
        } catch (Exception $e) {
            respond(['ok' => false, 'db' => true, 'message' => 'Gagal menyimpan hasil.'], 500);
        }
    }

    case 'leaderboard': {
        try {
            $stmt = $pdo->query(
                'SELECT player_name, wins, losses, draws,
                        (wins * 3 + draws) AS score
                 FROM leaderboard
                 ORDER BY score DESC, wins DESC
                 LIMIT 20'
            );
            respond(['ok' => true, 'db' => true, 'data' => $stmt->fetchAll()]);
        } catch (Exception $e) {
            respond(['ok' => false, 'db' => true, 'message' => 'Gagal mengambil leaderboard.'], 500);
        }
    }

    default:
        respond(['ok' => false, 'message' => 'Aksi tidak dikenal.'], 400);
}
