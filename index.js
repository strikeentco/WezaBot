var _ = require('lodash');
var Bot = require('teabot');

var helpers = require('./helpers');
var checkWeza = helpers.checkWeza;
var _process = helpers._process;
var getHTTPS = helpers.getHTTPS;
var getJSON = helpers.getJSON;

var config = require('./config');
var token = config.token;
var botanToken = config.botanToken;
var name = config.name;

var TeaBot = new Bot(token, name, {analytics: {key: botanToken}});

/** Commands block */
TeaBot
  .defineCommand(['/start', '/help'], function(dialog) {
    dialog
      .setKeyboard()
      .sendMessage('Hi there!\nI\'m a Weza bot. I can send you current weather in selected city.\nJust send your location or use one of the available commands:\n/city - Current weather by city name\n/id - Current weather by city id\n/history - The last five cities\n/units - Change units (Celsius by default)\n/cancel - Cancel the current command');
  })
  .defineCommand('/id', function(dialog) {
    if (dialog.message.getArgument()) {
      dialog.startAction('/id', true);
    } else {
      dialog.startAction('/id').sendMessage('Please, send me city geo id.');
    }
  })
  .defineCommand('/city', function(dialog) {
    dialog.startAction('/city').sendMessage('Please, send me city name.');
  })
  .defineCommand('/units', function(dialog) {
    var units = dialog.getUserData('units') || 'Celsius';
    dialog
      .startAction('/units')
      .setKeyboard([['Celsius', 'Fahrenheit'], ['/cancel']], true, true)
      .sendMessage('Please, send me new units (' + units + ' is now) or /cancel.');
  })
  .defineCommand('/history', function(dialog) {
    var locations = [];
    _.forEach(dialog.getUserData('locations'), function(n, key) {
      locations.push(n.show_name + ' (id: ' + n.city_id + ')');
    });

    if (!locations.length) {
      dialog.sendMessage('Oh snap, location list is empty! Let\'s add something to it.\nSend /help for more information.');
    } else {
      dialog
        .startAction('/history')
        .setKeyboard(_.chunk(locations, 1), true, true)
        .sendMessage('Choose one of the list, please, or /cancel.');
    }
  })
  .defineCommand('/cancel', function(dialog) {
    if (dialog.inAction()) {
      dialog
        .setKeyboard()
        .endAction()
        .sendMessage('Ok, now you can try something else, send me /help for more information.');
    }
  })
  .defineCommand(function(dialog) {
    dialog.sendMessage('Send me /help for more information.');
  });
/** Commands block */

/** Actions block */
TeaBot
  .defineAction('/id', function(dialog) {
    var geoId = dialog.message.getArgument();
    if (!geoId || geoId.length < 4) {
      dialog.sendMessage('Sorry, IDK this city id, try another one or send /cancel.');
    } else {
      checkWeza(geoId, dialog);
    }
  })
  .defineAction('/units', function(dialog) {
    var units = dialog.getUserData('units') || 'Celsius';
    var _units = dialog.message.getArgument().toLocaleLowerCase();
    if (_.indexOf(['fahrenheit', 'celsius'], _units) == -1) {
      dialog.setKeyboard([['Celsius', 'Fahrenheit'], ['/cancel']], true, true);
      dialog.sendMessage('Please, send me new units (' + units + ' is now) or /cancel.');
    } else {
      dialog.setUserData('units', _units);
      dialog
        .setKeyboard()
        .endAction()
        .sendMessage('Ok, now units is ' + dialog.getUserData('units'));
    }
  })
  .defineAction('/history', function(dialog) {
    var text = dialog.message.getArgument();
    if (text && text.length > 3) {
      var num = text.replace(/.*\D(?=\d)|\D+$/g, '');
      if (num.length && num.length > 3) {
        checkWeza(num, dialog);
      } else {
        dialog.sendMessage('Sorry, IDK this city, try another one or send /cancel.');
      }
    } else {
      dialog.sendMessage('Sorry, IDK this city, try another one or send /cancel.');
    }
  });

TeaBot.defineAction('/city', function(dialog) {
  var text = dialog.message.getArgument();
  if (text.length > 3) {
    getJSON('city.json?q=' + text + '&limit=1').then(function(res) {
      if (res.length) {
        _process(dialog, res);
      } else {
        dialog.sendMessage('Sorry, IDK this city, try another one or send /cancel.');
      }
    });
  } else {
    dialog.sendMessage('Sorry, IDK this city, try another one or send /cancel.');
  }
});

TeaBot.defineAction('/city:country', function(dialog) {
  var text = dialog.message.getArgument();
  var data = dialog.getTempData('data') || [];
  _process(dialog, _.filter(data, function(s) {
    return _.startsWith(s.country.toLocaleLowerCase(), text.toLocaleLowerCase());
  }));
});

TeaBot.defineAction('/city:city', function(dialog) {
  var text = dialog.message.getArgument();
  var num = text.replace(/.*\D(?=\d)|\D+$/g, '');
  text = text.split(', ');
  var data = dialog.getTempData('data') || [];
  if (num.length && num.length > 3) {
    checkWeza(num, dialog);
  } else {
    _process(dialog, _.filter(data, function(s) {
      return _.startsWith(s.show_name.toLocaleLowerCase(), [text[0], text[1]].join(', ').toLocaleLowerCase());
    }));
  }
});

TeaBot.defineAction('/city:city:double', function(dialog) {
  var text = dialog.message.argument;
  checkWeza(_.parseInt(text), dialog);
});
/** Actions block */

TeaBot.onLocation(function(dialog, location) {
  dialog.setTempData('location', location);
  var lat = location.latitude || false;
  var lon = location.longitude || false;
  if (lat && lon) {
    getJSON('geo.json?lat=' + lat + '&lon=' + lon).then(function(res) {
      if (res._id) {
        checkWeza(res._id, dialog);
      } else {
        dialog.sendMessage('Sorry, IDK this city, try another one.');
      }
    });
  } else {
    dialog.sendMessage('Sorry, IDK this city, try another one.');
  }
});

TeaBot.startPooling();
