<?php

header('Content-type: application/json');

$p = isset($_POST) && !empty($_POST) ? $_POST : $_GET;
$call = isset($p['call']) ? 'api_' . $p['call'] : null;
$r = [];
if ($call && function_exists($call)) {
  $r = $call($p, $r);
}

echo file_get_contents('events.json');


/**
 * It reads the events and an array of data, and updates the event with the matching id.
 * 
 * @param array $p the parameters passed to the API
 * @param array $r response
 */
function api_set_event($p, $r) {
  $events = read_events();
  $item = isset($p['item']) ? $p['item'] : null;
  if ($item) {
    $item['id'] = isset($item['id']) ? intval($item['id']) : null;
    if ($item['id']) {
      foreach ($events as $ei => $event) {
        if ($item['id'] == $event['id']) {
          foreach ($item as $key => $value) {
            switch ($key) {
              case 'data':
                break;
              default:
                $value = intval($value);
                break;
            }
            $events[$ei][$key] = $value;
          }
        }
      }
    } else {
      $r['errors'][] = 'no id';
    }
  } else {
    $r['errors'][] = 'no item';
  }
  write_events($events);
}


function read_events() {
  return json_decode(file_get_contents('events.json'), true);;
}

function write_events($events) {
  return file_put_contents('events.json', json_encode($events));
}

function api_reset_events() {
  $events = array(
    array(
      'id' => 1,
      'room' => 2,
      'start' => time(),
      'end' => time() + (86400),
      'data' => 'now() +1d'
    ),
    array(
      'id' => 2,
      'room' => 2,
      'start' => time() + (86400 * 2),
      'end' => time() + (86400 * 4),
      'data' => 'Item +1d +3d'
    ),
    array(
      'id' => 3,
      'room' => 2,
      'start' => time() + (86400 * 2),
      'end' => time() + (86400 * 12),
      'data' => 'now() +1d 10d'
    ),
    array(
      'id' => 4,
      'room' => 1,
      'start' => time() + (86400 * 6),
      'end' => time() + (86400 * 10) + 43200,
      'data' => 'now()+6d 4d12h'
    ),
    array(
      'id' => 5,
      'room' => 1,
      'start' => mktime(17, 0, 0, 12, 24, date("Y")),
      'end' => mktime(23, 59, 59, 12, 24, date("Y")),
      'cssclass' => "xmas",
      'data' => 'X-Mas <br><img src="data/img/harley-engine.jpg" style="width:100%; height:auto;"/>'
    ),
    array(
      'id' => 6,
      'room' => 3,
      'start' => mktime(0, 0, 0, 12, 31, date("Y")),
      'end' => mktime(23, 59, 59, 12, 31, date("Y")),
      'data' => 'Sylvester'
    ),
    array(
      'id' => 7,
      'room' => 3,
      'start' => mktime(0, 0, 0, 1, 1, date("Y") + 1),
      'end' => mktime(23, 59, 59, 1, 1, date("Y") + 1),
      'data' => 'New Year'
    )
  );

  return write_events($events);
}
