var directionsService;
var directionsDisplay;
var placesService;
var geocoder;

var origin = null;
var destination = null;
var waypoints = [];
var routeStopsNames = {
  origin: null,
  destination: null,
  stops: [],
};

var helpText;
var originInput;
var destinationInput;
var currentInput = null;

function initMap() {
  var map = new google.maps.Map(document.getElementById('map'), {
    zoom: 14,
    center: {lat: 4.1374244, lng: -73.6310358},  // Villavicencio.
    draggableCursor: 'auto',
    draggingCursor: 'move'
  });

  originInput = document.getElementById("route-mapping-origin");
  destinationInput = document.getElementById("route-mapping-destination");
  helpText = document.getElementById("map-help");

  directionsService = new google.maps.DirectionsService;
  directionsDisplay = new google.maps.DirectionsRenderer({
    draggable: true,
    map: map,
  });
  
  placesService = new google.maps.places.PlacesService(map);
  geocoder = new google.maps.Geocoder;

  directionsDisplay.addListener('directions_changed', function() {
    computeTotalDistance(directionsDisplay.getDirections());
    updateStopsPoints(directionsDisplay.getDirections());
  });

  map.addListener('click', function(e) {
    pointClicked(e, map);
  });
}

var marker;
var markers = [];
function pointClicked(e, map) {
  let pointValue = e.placeId ? {placeId: e.placeId} : e.latLng;
  marker = new google.maps.Marker({
    position: e.latLng,
    map: map
  });
  markers.push(marker);
  // map.panTo(e.latLng);
  if (currentInput !== null) {
    if (currentInput === "origin") {
      if (origin === null) {
        updateStopAddress(e, "origin");
      }
      origin = pointValue;
    }
    else if (currentInput === "destination") {
      if (destination === null) {
        updateStopAddress(e, "destination");
      }
      destination = pointValue;
    }
    else {
      let stops = 0;
      let isNew = true;
      for (let i = 0; i < waypoints.length; i++) {
        if (waypoints[i].stopover) {
          if (stops === currentInput) {
            waypoints[i].location = pointValue;
            isNew = false;
            break;
          }
          stops++;
        }
      }
      if (isNew) {
        waypoints.push({location: pointValue, stopover: true});
      }
      updateStopAddress(e, currentInput);
    }
    currentInput = null;
  }
  else if (origin === null) {
    origin = pointValue;
    updateStopAddress(e, "origin");
  }
  else if (destination === null) {
    destination = pointValue;
    //updateStopAddress(e, routeStopsNames.destination);
  }
  else {
    waypoints.push({location: destination, stopover: false});
    destination = pointValue;
    //updateStopAddress(e, routeStopsNames.destination);
  }
  helpText.innerHTML = "Haz clic en el mapa para agregar un punto a la ruta";
  if (origin !== null && destination !== null) {
    for (var i = 0; i < markers.length; i++) {
      markers[i].setMap(null);
    }
    displayRoute(origin, destination, waypoints);
  }
}

function originChange() {
  if (originInput.value === "" || originInput.value === undefined) {
    currentInput = "origin";
    helpText.innerHTML = "Haz clic en un punto en el mapa para cambiar el origen";
  }
}

function destinationChange() {
  if (destinationInput.value === "" || destinationInput.value === undefined) {
    currentInput = "destination";
    helpText.innerHTML = "Haz clic en un punto en el mapa para cambiar el destino";
  }
}

function stopChange(stopIndex) {
  var stopInput = document.getElementById("route-mapping-stop-"+stopIndex);
  if (stopInput.value === "" || stopInput.value === undefined) {
    currentInput = stopIndex;
    helpText.innerHTML = "Haz clic en un punto en el mapa para cambiar la parada";
  }
}

function removeStop(stopIndex, button) {
  helpText.innerHTML = "Haz clic en el mapa para agregar un punto a la ruta";
  let stops = 0;
  for (let i = 0; i < waypoints.length; i++) {
    if (waypoints[i].stopover) {
      if (stops === stopIndex) {
        waypoints.splice(i, 1);
        displayRoute(origin, destination, waypoints);
        return;
      }
      stops++;
    }
  }
  button.parentNode.parentNode.removeChild(button.parentNode);
}

function addStop() {
  var stopsContainer = document.getElementById("route-mapping-stops");
  stopsContainer.innerHTML += getStopTemplate(routeStopsNames.stops.length);
  document.getElementById("route-mapping-stop-"+ routeStopsNames.stops.length).click();
}

function getStopTemplate(id, value) {
  var val = "";
  if (value) {
    val = 'value="'+ value +'"';
  }
  return '<div class="input-field">'+
    '<i class="material-icons prefix white-text route-stop-icon">pin_drop</i>'+
    '<input id="route-mapping-stop-'+ id +'" ' + val + ' class="route-stop icon-prefix" placeholder="Parada"' + 
    'type="text" onkeyup="stopChange('+ id +')" onClick="this.select(); stopChange('+ id +');">'+
    '<button onclick="removeStop('+ id +', this)" style="margin-left: 1px;" class="btn-floating tiny transparent waves-effect waves-light"><i class="material-icons white-text" style="">close</i></button>' +
  '</div>';
}

function updateStopAddress(e, currentInput) {
  if (e.placeId) {
    placesService.getDetails({
      placeId: e.placeId
    }, function(place, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        if (currentInput === "origin") {
          routeStopsNames.origin = place.name;
        }
        else if (currentInput === "destination") {
          routeStopsNames.destination = place.name;
        }
        else {
          routeStopsNames.stops[currentInput] = place.name;
        }
        updateInputsAddresses();
      }
    });
  }
  else {
    geocodeLatLng(e.latLng, geocoder, map, function(pointInfo){
      if (pointInfo !== null) {
        if (currentInput === "origin") {
          routeStopsNames.origin = pointInfo.formatted_address;
        }
        else if (currentInput === "destination") {
          routeStopsNames.destination = pointInfo.formatted_address;
        }
        else {
          routeStopsNames.stops[currentInput] = pointInfo.formatted_address;
        }
        updateInputsAddresses();
      }
    });
  }
}

function updateInputsAddresses() {
  originInput.value = routeStopsNames.origin;
  destinationInput.value = routeStopsNames.destination;
  var stopsContainer = document.getElementById("route-mapping-stops");
  stopsContainer.innerHTML = "";
  for (var i = 0; i < routeStopsNames.stops.length; i++) {
    stopsContainer.innerHTML += getStopTemplate(i, routeStopsNames.stops[i]);
  }
}

// directionsDisplay.directions.request.waypoints

function displayRoute(origin, destination, waypoints) {
  directionsService.route({
    origin: origin,
    destination: destination,
    waypoints: waypoints,
    travelMode: 'DRIVING',
    avoidTolls: false
  }, function(response, status) {
    if (status === 'OK') {
      directionsDisplay.setDirections(response);
    } else {
      if (status === "MAX_WAYPOINTS_EXCEEDED") {
        alert("Ha excedido el máximo de puntos en la ruta");
      }
      else {
        alert('No se puede mostrar la ruta debido a: ' + status);
      }
    }
  });
}

function geocodeLatLng(latLng, geocoder, map, callback) {
  geocoder.geocode({'location': latLng}, function(results, status) {
    if (status === 'OK') {
      if (results[1]) {
        callback(results[1]);
      } else {
        window.alert('No hay resultados');
        callback(null);
      }
    } else {
      window.alert('Fallo en localización por: ' + status);
      callback(null);
    }
  });
}

function updateStopsPoints(result) {
  origin = result.request.origin;
  destination = result.request.destination;
  waypoints = result.request.waypoints;

  var route = result.routes[0];
  routeStopsNames.origin = null;
  routeStopsNames.destination = null;
  routeStopsNames.stops = [];
  for (var i = 0; i < route.legs.length; i++) {
    if (routeStopsNames.origin === null) {
      routeStopsNames.origin = route.legs[i].start_address;
    }
    if (routeStopsNames.destination === null) {
      routeStopsNames.destination = route.legs[i].end_address;
    }
    else {
      routeStopsNames.stops.push(routeStopsNames.destination);
      routeStopsNames.destination = route.legs[i].end_address;
    }
  }
  updateInputsAddresses();
}

function computeTotalDistance(result) {
  var total = 0;
  var myroute = result.routes[0];
  for (var i = 0; i < myroute.legs.length; i++) {
    total += myroute.legs[i].distance.value;
  }
  total = total / 1000;
  total = Math.round(total * 100) / 100;
  document.getElementById('route-mapping-total').innerHTML = total + ' km';
}