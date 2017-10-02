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

var markerInitial;
function pointClicked(e, map) {
  let pointValue = e.placeId ? {placeId: e.placeId} : e.latLng;
  if (currentInput !== null) {
    if (currentInput === "origin") {
      origin = pointValue;
    }
    else if (currentInput === "destination") {
      destination = pointValue;
    }
    currentInput = null;
  }
  else if (origin === null) {
    origin = pointValue;
    markerInitial = new google.maps.Marker({
      position: e.latLng,
      label: "Origen",
      map: map
    });
    map.panTo(e.latLng);
    updateOriginAddress(e);
    return;
  }
  else if (destination === null) {
    markerInitial.setMap(null);
    destination = pointValue;
    //updateStopAddress(e, routeStopsNames.destination);
  }
  else {
    markerInitial = null;
    waypoints.push({location: destination, stopover: false});
    destination = pointValue;
    //updateStopAddress(e, routeStopsNames.destination);
  }
  displayRoute(origin, destination, waypoints);
}

function originChange() {
  if (originInput.value === "" || originInput.value === undefined) {
    currentInput = "origin";
  }
}

function destinationChange() {
  if (destinationInput.value === "" || destinationInput.value === undefined) {
    currentInput = "destination";
  }
}

function addStop() {

}

function updateOriginAddress(e) {
  if (e.placeId) {
    placesService.getDetails({
      placeId: e.placeId
    }, function(place, status) {
      if (status === google.maps.places.PlacesServiceStatus.OK) {
        routeStopsNames.origin = place.name;
        updateInputsAddresses();
      }
    });
  }
  else {
    geocodeLatLng(e.latLng, geocoder, map, function(pointInfo){
      if (pointInfo !== null) {
        routeStopsNames.origin = pointInfo.formatted_address;
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
    stopsContainer.innerHTML += 
    '<div class="input-field">'+
      '<i class="material-icons prefix white-text">place</i>'+
      '<input id="route-mapping-stop-'+ i +'" value="'+ routeStopsNames.stops[i] +'" class="icon-prefix" placeholder="Parada" type="text">'+
    '</div>'
    ;
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
  console.log(result);
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