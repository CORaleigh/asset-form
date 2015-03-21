angular
  .module('assetFormApp')
  .directive('loginForm', [ 'login', function (login) {
    return {
      restrict: 'E',
      templateUrl: 'scripts/loginForm/loginForm.html',
      controller: function ($scope, login) {
        $scope.token = '';
        $scope.loggedIn = true;
        $scope.login = function (user, password) {
          login.login(user, password).then(function (token) {
            $scope.token = token;
            $scope.loggedIn = token;
            if (token) {
              $scope.modal.modal('hide');
            }
          });
        };
      },
      link: function (scope, element, attrs) {
        scope.modal = $('.modal', element[0])
        scope.modal.modal({keyboard: false, backdrop: 'static'});
      }
    }
  }])
  .factory('login', ['$http', '$q', function($http, $q){
    var service = {login:login};
    return service;
    function login(user, password){
      var deferred = $q.defer()
      $http({
        method: 'POST',
        url: 'http://mapstest.raleighnc.gov/arcgis/tokens/',
        data: $.param(
          {
            request: 'getToken',
            username: user,
            password: password,
            expiration: 60,
            f: 'json'
          }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).success(function (data) {
        deferred.resolve(data.token);
      }).
	  error(function(data, status, headers, config) {
	    // called asynchronously if an error occurs
	    // or server returns response with an error status.
	  });
      return deferred.promise;
    };
  }]);