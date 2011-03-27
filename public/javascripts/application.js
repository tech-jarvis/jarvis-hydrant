$(function() {
  var center = new google.maps.LatLng(42.358431, -71.059773);
  var zoomLevel = 15;
  var mapOptions = {
    center: center,
    mapTypeControl: false,
    mapTypeId: google.maps.MapTypeId.ROADMAP,
    panControl: false,
    zoom: zoomLevel
  };
  var map = new google.maps.Map(document.getElementById("map_canvas"), mapOptions);
  var activeHydrantId;
  var activeMarker;
  var activeInfoWindow;
  var hydrantIds = [];
  function addMarker(hydrantId, point, color) {
    if($.inArray(hydrantId, hydrantIds) != -1) {
      return;
    }
    var image = new google.maps.MarkerImage(color,
      new google.maps.Size(27.0, 37.0),
      new google.maps.Point(0, 0),
      new google.maps.Point(13.0, 18.0)
    );
    var shadow = new google.maps.MarkerImage('/images/markers/shadow.png',
      new google.maps.Size(46.0, 37.0),
      new google.maps.Point(0, 0),
      new google.maps.Point(13.0, 18.0)
    );
    var marker = new google.maps.Marker({
      animation: google.maps.Animation.DROP,
      icon: image,
      map: map,
      position: point,
      shadow: shadow
    });
    google.maps.event.addListener(marker, 'click', function() {
      if(activeInfoWindow) {
        activeInfoWindow.close();
      }
      $.get('/hydrant', {
        'hydrant_id': hydrantId
      }, function(data) {
        var infoWindow = new google.maps.InfoWindow({
          content: data,
          maxWidth: 350
        });
        infoWindow.open(map, marker);
        activeHydrantId = hydrantId;
        activeMarker = marker;
        activeInfoWindow = infoWindow;
      });
    });
    hydrantIds.push(hydrantId);
  }
  function addMarkersAround(lat, lng) {
    $.get('/hydrants.json', {
      'commit': $('#address_submit').val(),
      'utf8': '✓',
      'authenticity_token': $('#address_form input[name="authenticity_token"]').val(),
      'lat': lat,
      'lng': lng
    }, function(data) {
      if(data.errors) {
        $('#address_label').addClass('error', 500);
        $('#address').addClass('error', 500);
        $('#address').focus();
      } else {
        var northMost;
        var eastMost;
        var southMost;
        var westMost;
        var i = 0;
        $(data).each(function(index, hydrant) {
          hydrant = hydrant.hydrant;
          if(!northMost || northMost > hydrant.lat) {
            northMost = hydrant.lat;
          }
          if(!eastMost || eastMost > hydrant.lng) {
            eastMost = hydrant.lng;
          }
          if(!southMost || southMost < hydrant.lat) {
            southMost = hydrant.lat;
          }
          if(!westMost || westMost < hydrant.lng) {
            westMost = hydrant.lng;
          }
          setTimeout(function() {
            point = new google.maps.LatLng(hydrant.lat, hydrant.lng);
            color = '/images/markers/' + (hydrant.user_id ? 'green' : 'red') + '.png';
            addMarker(hydrant.id, point, color);
          }, i * 100);
          if($.inArray(hydrant.id, hydrantIds) == -1) {
            i += 1;
          }
        });
        southWest = new google.maps.LatLng(southMost, westMost);
        northEast = new google.maps.LatLng(northMost, eastMost);
        bounds = new google.maps.LatLngBounds(southWest, northEast);
        map.fitBounds(bounds);
      }
    });
  }
  google.maps.event.addListener(map, 'dragend', function() {
    center = map.getCenter();
    addMarkersAround(center.lat(), center.lng());
  });
  $('#address_form').submit(function() {
    if($('#address').val() === '') {
      $('#address_label').addClass('error', 500);
      $('#address').addClass('error', 500);
      $('#address').focus();
    } else {
      $.get('/address.json', {
        'commit': $('#address_submit').val(),
        'utf8': '✓',
        'authenticity_token': $('#address_form input[name="authenticity_token"]').val(),
        'city_state': $('#city_state').val(),
        'address': $('#address').val()
      }, function(data) {
        if(data.errors) {
          $('#address_label').addClass('error', 500);
          $('#address').addClass('error', 500);
          $('#address').focus();
        } else {
          addMarkersAround(data[0], data[1]);
        }
      });
    }
    return false;
  });
  $('#combo_form input[type="radio"]').live('click', function() {
    var self = $(this);
    if('new' == self.val()) {
      $('#user_forgot_password_fields').slideUp();
      $('#user_sign_in_fields').slideUp();
      $('#user_sign_up_fields').slideDown();
      $('#combo_form').data('state', 'user_sign_up');
    } else if('existing' == self.val()) {
      $('#user_sign_up_fields').slideUp();
      $('#user_sign_in_fields').slideDown(function() {
      $('#combo_form').data('state', 'user_sign_in');
        $('#user_forgot_password_link').click(function() {
          $('#user_sign_in_fields').slideUp();
          $('#user_forgot_password_fields').slideDown(function() {
            $('#user_remembered_password').click(function() {
              $('#user_forgot_password_fields').slideUp();
              $('#user_sign_in_fields').slideDown();
              $('#combo_form').data('state', 'user_sign_in');
            });
          });
          $('#combo_form').data('state', 'user_forgot_password');
        });
      });
    }
  });
  $('#combo_form').live('submit', function() {
    var errors = []
    if(!/[\w\.%\+\]+@[\w\]+\.+[\w]{2,}/.test($('#user_email').val())) {
      errors.push($('#user_email'));
      $('#user_email_label').addClass('error', 500);
      $('#user_email').addClass('error', 500);
    } else {
      $('#user_email_label').removeClass('error');
      $('#user_email').removeClass('error');
    }
    if(!$(this).data('state') || $(this).data('state') === 'user_sign_up') {
      if($('#user_name').val() === '') {
        errors.push($('#user_name'));
        $('#user_name_label').addClass('error', 500);
        $('#user_name').addClass('error', 500);
      } else {
        $('#user_name_label').removeClass('error');
        $('#user_name').removeClass('error');
      }
      if($('#user_password_confirmation').val().length < 6 || $('#user_password_confirmation').val().length > 20) {
        errors.push($('#user_password_confirmation'));
        $('#user_password_confirmation_label').addClass('error', 500);
        $('#user_password_confirmation').addClass('error', 500);
      } else {
        $('#user_password_confirmation_label').removeClass('error');
        $('#user_password_confirmation').removeClass('error');
      }
      if(errors.length > 0) {
        errors[0].focus();
      } else {
        $.post('/users.json', {
          'commit': $('#user_sign_up_submit').val(),
          'utf8': '✓',
          'authenticity_token': $('#combo_form input[name="authenticity_token"]').val(),
          'user': {
            'email': $('#user_email').val(),
            'name': $('#user_name').val(),
            'organization': $('#user_organization').val(),
            'voice_number': $('#user_voice_number').val(),
            'sms_number': $('#user_sms_number').val(),
            'password': $('#user_password_confirmation').val(),
            'password_confirmation': $('#user_password_confirmation').val()
          }
        }, function(data) {
          if(data.errors) {
            if(data.errors.email) {
              errors.push($('#user_email'));
              $('#user_email_label').addClass('error', 500);
              $('#user_email').addClass('error', 500);
            }
            if(data.errors.name) {
              errors.push($('#user_name'));
              $('#user_name_label').addClass('error', 500);
              $('#user_name').addClass('error', 500);
            }
            if(data.errors.organization) {
              errors.push($('#user_organization'));
              $('#user_organization_label').addClass('error', 500);
              $('#user_organization').addClass('error', 500);
            }
            if(data.errors.voice_number) {
              errors.push($('#user_voice_number'));
              $('#user_voice_number_label').addClass('error', 500);
              $('#user_voice_number').addClass('error', 500);
            }
            if(data.errors.sms_number) {
              errors.push($('#user_sms_number'));
              $('#user_sms_number_label').addClass('error', 500);
              $('#user_sms_number').addClass('error', 500);
            }
            if(data.errors.password) {
              errors.push($('#user_password_confirmation'));
              $('#user_password_confirmation_label').addClass('error', 500);
              $('#user_password_confirmation').addClass('error', 500);
            }
            errors[0].focus();
          } else {
            $.get('/hydrant', {
              'hydrant_id': activeHydrantId
            }, function(data) {
              activeInfoWindow.setContent(data);
            });
          }
        });
      }
    } else if($(this).data('state') === 'user_sign_in') {
      if($('#user_password').val().length < 6 || $('#user_password').val().length > 20) {
        errors.push($('#user_password'));
        $('#user_password_label').addClass('error', 500);
        $('#user_password').addClass('error', 500);
      } else {
        $('#user_password_label').removeClass('error');
        $('#user_password').removeClass('error');
      }
      if(errors.length > 0) {
        errors[0].focus();
      } else {
        $.post('/users/sign_in.json', {
          'commit': $('#user_sign_in_submit').val(),
          'utf8': '✓',
          'authenticity_token': $('#combo_form input[name="authenticity_token"]').val(),
          'user': {
            'email': $('#user_email').val(),
            'password': $('#user_password').val(),
            'remember_me': $('#user_remember_me').val()
          }
        }, function(data) {
          if(data.errors) {
            $('#user_password_label').addClass('error', 500);
            $('#user_password').addClass('error', 500);
            $('#user_password').focus();
          } else {
            $.get('/hydrant', {
              'hydrant_id': activeHydrantId
            }, function(data) {
              activeInfoWindow.setContent(data);
            });
          }
        });
      }
    } else if($(this).data('state') === 'user_forgot_password') {
      if(errors.length > 0) {
        errors[0].focus();
      } else {
        $.post('/users/password.json', {
          'commit': $('#user_forgot_password_submit').val(),
          'utf8': '✓',
          'authenticity_token': $('#combo_form input[name="authenticity_token"]').val(),
          'user': {
            'email': $('#user_email').val()
          }
        }, function(data) {
          if(data.errors) {
            $('#user_email_label').addClass('error', 500);
            $('#user_email').addClass('error', 500);
            $('#user_email').focus();
          } else {
            $('#user_forgot_password_fields').slideUp();
            $('#user_sign_in_fields').slideDown();
          }
        });
      }
    }
    return false;
  });
  $('#sign_out_form').live('submit', function() {
    $.get('/users/sign_out.json', {
      'commit': $('#sign_out_form_submit').val(),
      'utf8': '✓',
      'authenticity_token': $('#sign_out_form input[name="authenticity_token"]').val()
    }, function(data) {
      $.get('/hydrant', {
        'hydrant_id': activeHydrantId
      }, function(data) {
        activeInfoWindow.setContent(data);
      });
    });
    return false;
  });
  $('#adoption_form').live('submit', function() {
    $.post('/hydrant', {
      'id': $('#hydrant_id').val(),
      'commit': $('#adoption_form_submit').val(),
      'utf8': '✓',
      'authenticity_token': $('#adoption_form input[name="authenticity_token"]').val(),
      '_method': 'put',
      'hydrant': {
        'user_id': $('#hydrant_user_id').val(),
        'name': $('#hydrant_name').val()
      }
    }, function(data) {
      $.get('/hydrant', {
        'hydrant_id': activeHydrantId
      }, function(data) {
        activeInfoWindow.setContent(data);
        image = new google.maps.MarkerImage('/images/markers/green.png',
          new google.maps.Size(27.0, 37.0),
          new google.maps.Point(0, 0),
          new google.maps.Point(13.0, 18.0)
        );
        activeMarker.setIcon(image);
        activeMarker.setAnimation(google.maps.Animation.BOUNCE);
      });
    });
    return false;
  });
  $('#abandon_form').live('submit', function() {
    var answer = window.confirm("Are you sure you want to abandon this hydrant?")
    if(answer) {
      $.post('/hydrant', {
        'id': $('#hydrant_id').val(),
        'commit': $('#abandon_form_submit').val(),
        'utf8': '✓',
        'authenticity_token': $('#abandon_form input[name="authenticity_token"]').val(),
        '_method': 'put',
        'hydrant': {
          'user_id': $('#hydrant_user_id').val(),
          'name': $('#hydrant_name').val()
        }
      }, function(data) {
        $.get('/hydrant', {
          'hydrant_id': activeHydrantId
        }, function(data) {
          activeInfoWindow.setContent(data);
          image = new google.maps.MarkerImage('/images/markers/red.png',
            new google.maps.Size(27.0, 37.0),
            new google.maps.Point(0, 0),
            new google.maps.Point(13.0, 18.0)
          );
          activeMarker.setIcon(image);
          activeMarker.setAnimation(null);
        });
      });
      return false;
    }
  });
  $('#steal_form').live('submit', function() {
    var answer = window.confirm("Are you sure you want to steal this hydrant?")
    if(answer) {
      $.post('/hydrant', {
        'id': $('#hydrant_id').val(),
        'commit': $('#steal_form_submit').val(),
        'utf8': '✓',
        'authenticity_token': $('#steal_form input[name="authenticity_token"]').val(),
        '_method': 'put',
        'hydrant': {
          'user_id': $('#hydrant_user_id').val(),
          'name': $('#hydrant_name').val()
        }
      }, function(data) {
        $.get('/hydrant', {
          'hydrant_id': activeHydrantId
        }, function(data) {
          activeInfoWindow.setContent(data);
          image = new google.maps.MarkerImage('/images/markers/red.png',
            new google.maps.Size(27.0, 37.0),
            new google.maps.Point(0, 0),
            new google.maps.Point(13.0, 18.0)
          );
          activeMarker.setIcon(image);
          activeMarker.setAnimation(null);
        });
      });
      return false;
    }
  });
  $('#edit_profile_form').live('submit', function() {
    $.get('/users/edit', {
      'commit': $('#edit_profile_form_submit').val(),
      'utf8': '✓',
      'authenticity_token': $('#edit_profile_form input[name="authenticity_token"]').val()
    }, function(data) {
      activeInfoWindow.setContent(data);
    });
    return false;
  });
  $('#edit_form').live('submit', function() {
    var errors = []
    if(!/[\w\.%\+\]+@[\w\]+\.+[\w]{2,}/.test($('#user_email').val())) {
      errors.push($('#user_email'));
      $('#user_email_label').addClass('error', 500);
      $('#user_email').addClass('error', 500);
    } else {
      $('#user_email_label').removeClass('error');
      $('#user_email').removeClass('error');
    }
    if($('#user_name').val() === '') {
      errors.push($('#user_name'));
      $('#user_name_label').addClass('error', 500);
      $('#user_name').addClass('error', 500);
    } else {
      $('#user_name_label').removeClass('error');
      $('#user_name').removeClass('error');
    }
    if($('#user_password').val() && ($('#user_password').val().length < 6 || $('#user_password').val().length > 20)) {
      errors.push($('#user_password'));
      $('#user_password_label').addClass('error', 500);
      $('#user_password').addClass('error', 500);
    } else {
      $('#user_password_label').removeClass('error');
      $('#user_password').removeClass('error');
    }
    if($('#user_current_password').val().length < 6 || $('#user_current_password').val().length > 20) {
      errors.push($('#user_current_password'));
      $('#user_current_password_label').addClass('error', 500);
      $('#user_current_password').addClass('error', 500);
    } else {
      $('#user_current_password_label').removeClass('error');
      $('#user_current_password').removeClass('error');
    }
    if(errors.length > 0) {
      errors[0].focus();
    } else {
      $.post('/users.json', {
        'id': $('#id').val(),
        'hydrant_id': activeHydrantId,
        'commit': $('#edit_form_submit').val(),
        'utf8': '✓',
        'authenticity_token': $('#edit_form input[name="authenticity_token"]').val(),
        '_method': 'put',
        'user': {
          'email': $('#user_email').val(),
          'name': $('#user_name').val(),
          'organization': $('#user_organization').val(),
          'voice_number': $('#user_voice_number').val(),
          'sms_number': $('#user_sms_number').val(),
          'password': $('#user_password').val(),
          'password_confirmation': $('#user_password').val(),
          'current_password': $('#user_current_password').val()
        }
      }, function(data) {
        if(data.errors) {
          if(data.errors.email) {
            errors.push($('#user_email'));
            $('#user_email_label').addClass('error', 500);
            $('#user_email').addClass('error', 500);
          }
          if(data.errors.name) {
            errors.push($('#user_name'));
            $('#user_name_label').addClass('error', 500);
            $('#user_name').addClass('error', 500);
          }
          if(data.errors.organization) {
            errors.push($('#user_organization'));
            $('#user_organization_label').addClass('error', 500);
            $('#user_organization').addClass('error', 500);
          }
          if(data.errors.voice_number) {
            errors.push($('#user_voice_number'));
            $('#user_voice_number_label').addClass('error', 500);
            $('#user_voice_number').addClass('error', 500);
          }
          if(data.errors.sms_number) {
            errors.push($('#user_sms_number'));
            $('#user_sms_number_label').addClass('error', 500);
            $('#user_sms_number').addClass('error', 500);
          }
          if(data.errors.password) {
            errors.push($('#user_password'));
            $('#user_password_label').addClass('error', 500);
            $('#user_password').addClass('error', 500);
          }
          if(data.errors.current_password) {
            errors.push($('#user_current_password'));
            $('#user_current_password_label').addClass('error', 500);
            $('#user_current_password').addClass('error', 500);
          }
          errors[0].focus();
        } else {
          activeInfoWindow.setContent(data);
        }
      });
    }
    return false;
  });
});
