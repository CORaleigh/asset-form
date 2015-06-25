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
          login.login(user, password).then(function (data) {
            if (data.token) {
              $scope.token = data.token;
              $scope.loggedIn = data.token;
              $scope.modal.modal('hide');         
            } else if (data.error) {
              $scope.loggedIn = false;
              $scope.message = data.error.details;
            }
          });
        };
      },
      link: function (scope, element, attrs) {
        scope.modal = $('#loginModal', element[0])
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
        url: 'https://maps.raleighnc.gov/arcgis/tokens/',
        data: $.param(
          {
            request: 'getToken',
            username: user,
            password: password,
            expiration: 60,
            f: 'json'
          }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).success(deferred.resolve).
	  error(deferred.resolve);
      return deferred.promise;
    };
  }]);