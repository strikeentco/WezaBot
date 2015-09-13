var https = require('https');
var _ = require('lodash');

var url = require('./config').url;

function getHTTPS(path) {
  return new Promise(function(resolve, reject) {
    https.get(url + path, function(response) {
      var chunks = [];

      response.on('data', function(chunk) {
        chunks.push(chunk);
      });

      response.on('end', function() {
        resolve(Buffer.concat(chunks));
      });
    }).on('error', function(e) {
      reject(e);
    });
  });
}

module.exports.getHTTPS = getHTTPS;

function getJSON(path) {
  return getHTTPS(path).then(JSON.parse);
}

module.exports.getJSON = getJSON;

function checkWeza(_id, dialog) {
  if (dialog.getUserData('units')) {
    var units = (dialog.getUserData('units').toLowerCase() == 'celsius') ? 'c' : 'f';
  } else {
    var units = 'c';
  }

  var id = function(data) {
    dialog.sendChatAction('upload_photo');
    getHTTPS('image.json?city=' + data.city_id + '&units=' + units).then(function(res) {
      history(dialog, data);
      var caption = data.name + ', ' + data.country + ' | http://weza.ws/' + units + '/' + data.city_id;
      dialog
        .setKeyboard()
        .endAction()
        .sendPhoto({buffer: res}, {caption: caption});
    });
  };

  getJSON('city.json?id=' + _id).then(function(res) {
    if (res.city_id) {
      id(res);
    } else {
      dialog.sendMessage('Sorry, IDK this city, try another one or send /cancel.');
    }
  });
}

module.exports.checkWeza = checkWeza;

function _process(dialog, data) {
  var country = [];
  var output = [];
  var double = [];
  var ids = [];
  _.forEach(data, function(n, key) {
    country.push(n.country);
    ids.push(n.city_id.toString());
    double.push(n.show_name);
    output.push(n.show_name + ' (id: ' + n.city_id + ')');
  });

  double = _.uniq(double);
  country = _.uniq(country);

  if (data.length === 1) {
    checkWeza(data[0].city_id, dialog);
  } else if (data.length > 1 && country.length === 1) {
    if (double.length === 1) {
      dialog
        .setKeyboard(_.chunk(ids, 1))
        .endAction(true)
        .startAction('/city:city:double')
        .sendMessage('Whoa, looks like we have a sort of twins, it\'s happens. Just choose one of the list ids, please, or /cancel.');
    } else {
      dialog.setTempData('data', data);
      dialog
        .setKeyboard(_.chunk(output, 1))
        .endAction(true)
        .startAction('/city:city')
        .sendMessage('Oh, looks like it\'s more than one city in the country with this name. Choose one of the list, please, or /cancel.');
    }
  } else if (data.length > 1 && country.length > 1) {
    dialog.setTempData('data', data);
    dialog
      .setKeyboard(_.chunk(country, 5))
      .endAction(true)
      .startAction('/city:country')
      .sendMessage('Oh, looks like it\'s more than one city in the world with this name. Send me country, please, or /cancel.');
  } else {
    dialog.sendMessage('Sorry, IDK this city, try another one or send /cancel.');
  }
}

module.exports._process = _process;

function history(dialog, data) {
  var locations = dialog.getUserData('locations') || dialog.setUserData('locations', []);
  locations.push(data);
  locations = _.uniq(locations, 'city_id');
  if (locations.length > 5) {
    locations.shift();
  }

  dialog.setUserData('locations', locations);
}

module.exports.history = history;
