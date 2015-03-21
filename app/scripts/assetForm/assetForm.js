angular
  .module('assetFormApp')
  .directive('assetForm', ['assets', function (assets) {
    return {
      require: '^?loginForm',
      restrict: 'E',
      templateUrl: 'scripts/assetForm/assetForm.html',
      controller: function ($scope, $timeout, $window) {
        $scope.siteSelected = function () {
          var f = $scope.fields.filter(function (f) {
            return f.name === 'SITE';
          });
          if (f.length > 0) {
            f = f[0];
            $scope.site = f.value;
            $scope.buildings = f.value.buildings;
          }
        };
        $scope.bldgSelected = function () {
          var f = $scope.fields.filter(function (f) {
            return f.name === 'LOCATION';
          });
          if (f.length > 0) {
            f = f[0];
            $scope.building = f.value;
          }
        };
        $scope.$watch('token', function (token) {
          if (token) {
            assets.getTables(token).then(function (data) {
              $scope.tables = data.tables;
            });
            assets.getSites(token).then(function (data) {
              $scope.sites = [];
              var siteNames = [];
              var bldgs = [];
              angular.forEach(data.features, function (f) {
                if (siteNames.indexOf(f.attributes.SITE) === -1) {
                  $scope.sites.push({name: f.attributes.SITE, buildings:[{name: f.attributes.LOCATION, id: f.attributes.FACILITYID, address: f.attributes.LEGACYID}]})
                  siteNames.push(f.attributes.SITE);
                } else {
                  var site = $scope.sites.filter(function (s) {
                    return s.name === f.attributes.SITE;
                  });
                  if (site.length > 0) {
                    site = site[0];
                    site.buildings.push({name: f.attributes.LOCATION, id: f.attributes.FACILITYID, address: f.attributes.LEGACYID});
                  }
                }
              });
            });
          }
        });
        $scope.tableSelected = function (id) {
            assets.getTypes($scope.token, id).then(function (data) {
              $scope.tableData = data;
              $scope.fields = [];
              $scope.types = data.types;
            });
        };
        $scope.typeSelected = function (type) {
          console.log($scope.fields);
          angular.forEach($scope.tableData.fields, function (f) {
            if (type.domains[f.name]) {
              f.domain = type.domains[f.name];
            }
          });
          $scope.fields = $scope.tableData.fields;
        };
        $scope.dateInit = function (e) {
          $('.date').datepicker({clearBtn: true});
        };
        $scope.inputBlur = function (field) {
          if (field.name == 'ASSET_TAG') {

            $scope.facilityid = field.value;
            $scope.oid = null;
            assets.checkAssetExists($scope.token, field.value, $scope.table.id).then(function (data) {
              console.log(data);
              if (data.features.length > 0) {
                $scope.oid = data.features[0].attributes.OBJECTID;
                setFieldValues(data.features[0].attributes);
                showMessage("warning", "Asset with this tag has already been created, changes will update the existing asset")
              } else {
                
              }
            });
          }
        }
        function setFieldValues (attributes) {
          var site = $scope.sites.filter(function (s) {
            return s.name === attributes['SITE'];
          });
          if (site.length > 0) {
            site = site[0];
            $scope.site = site;
            $scope.buildings = site.buildings;
          }
          var type = $scope.types.filter(function (t) {
            return t.id === attributes['ASSET_TYPE_SUBTYPE'];
          });
          if (type.length > 0) {
            type = type[0];
            $scope.type = type;
          }
          angular.forEach($scope.fields, function (f) {
              switch (f.name) {
                case 'SITE':
                  f.value = site;
                break;
                case 'LOCATION':
                  var bldg = $scope.buildings.filter(function (b) {
                    return b.name === attributes['LOCATION'];
                  });
                  if (bldg.length > 0) {
                    bldg = bldg[0];
                    f.value = bldg;
                    $scope.building = bldg;
                  }
                break;
                default:
                  f.value = attributes[f.name];
                  if (f.type === 'esriFieldTypeDate' && f.value) {
                    f.value = moment(f.value).format('MM/DD/YYYY');
                  }
                break;
              }
          });
        };

        function showMessage (type, message) {
          $scope.alert = {type: type, message: message};
          $timeout(function () {
            $scope.alert = null;
          }, 10000);
          $window.scrollTo(0,0);
        };

        $scope.clearForm = function (all) {
          $scope.oid = null;
          angular.forEach($scope.fields, function (f) {
            if (all) {
              f.value = null;
            } else {
              if ($scope.persistedFields.indexOf(f.name) === -1) {
                f.value = null;
              }
            }
          });
        }
        $scope.submitForm = function () {
          var feature = {attributes: {}};
          var processing = true;
          angular.forEach($scope.fields, function (f) {
              switch (f.name) {
                case 'ASSET_TYPE_SUBTYPE':
                  feature.attributes[f.name] = $scope.type.id;
                break;
                case 'ASSET_TYPE':
                  feature.attributes[f.name] = $scope.type.name;
                break;
                case 'SITE':
                  feature.attributes[f.name] = $scope.site.name;
                break;
                case 'LOCATION':
                  feature.attributes[f.name] = $scope.building.name;
                break;
                case 'BUILDINGID':
                  feature.attributes[f.name] = $scope.building.id;
                break;
                case 'LEGACYID':
                  feature.attributes[f.name] = $scope.building.address;
                break;
                case 'FACILITYID':
                  feature.attributes[f.name] = $scope.facilityid;
                break;
                default:
                  if (f.value) {
                    feature.attributes[f.name] = f.value;                 
                    if (f.value === '') {
                      feature.attributes[f.name] = null;
                    }
                  } else {
                      feature.attributes[f.name] = null;
                    }              
                break;
              }
          });
          if ($scope.oid) {
            feature.attributes.OBJECTID = $scope.oid;
          }
          $scope.feature = feature;
          assets.submitAsset($scope.token, feature, $scope.table.id, $scope.oid).then(function (data) {
            processing = false;
            console.log(data);
            var success = false;
            if (data.addResults) {
              success = data.addResults[0].success;
            } else if (data.updateResults) {
              success = data.updateResults[0].success;
            }
            if (success) {
              showMessage("success", "Asset successfully " + ((data.updateResults) ? 'updated': 'created'));
            } else {
              showMessage("danger", "Error submitting assets, please try again");
            }
            
            $scope.oid = null;
            $scope.clearForm(false);
          });
        };
      },
      link: function (scope, element, attrs, loginFormCtrl) {
        scope.hiddenFields = attrs.hiddenFields.split(',');
        scope.persistedFields = attrs.persistedFields.split(',');
      }
    }
  }])
   .factory('assets', ['$http', '$q', function($http, $q){
    var service = {getTables:getTables, getTypes:getTypes, getSites:getSites, checkAssetExists:checkAssetExists, submitAsset:submitAsset},
      baseUrl = 'http://mapstest.raleighnc.gov/arcgis/rest/services/Parks/AssetForm/FeatureServer';
    return service;
    function getTables(token){
      var deferred = $q.defer();
      $http({
        method: 'POST',
        url: baseUrl,
        data: $.param(
          {
            token: token,
            f: 'json'
          }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).success(function (data) {
        deferred.resolve(data);
      });
      return deferred.promise;
    };
    function getTypes(token, id){
      var deferred = $q.defer();
      $http({
        method: 'POST',
        url: baseUrl+'/'+id,
        data: $.param(
          {
            token: token,
            f: 'json'
          }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).success(function (data) {
        deferred.resolve(data);
      });
      return deferred.promise;
    };
    function getSites (token) {
       var deferred = $q.defer();
      $http({
        method: 'POST',
        url: baseUrl+'/0/query',
        data: $.param(
          {
            token: token,
            where: '1=1',
            returnGeometry: false,
            outFields: '*',
            f: 'json'
          }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).success(function (data) {
        deferred.resolve(data);
      });
      return deferred.promise;
    };
    function checkAssetExists (token, id, table) {
       var deferred = $q.defer();
      $http({
        method: 'POST',
        url: baseUrl+'/'+ table +'/query',
        data: $.param(
          {
            token: token,
            where: "FACILITYID = '" + id + "'",
            returnGeometry: false,
            outFields: '*',
            f: 'json'
          }),
        headers: {'Content-Type': 'application/x-www-form-urlencoded'}
      }).success(function (data) {
        deferred.resolve(data);
      });
      return deferred.promise;
    };
    function submitAsset (token, feature, table, oid) {
       var deferred = $q.defer();
      $http({
        method: 'POST',
        url: baseUrl+'/'+ table +'/' + ((oid) ? 'updateFeatures' : 'addFeatures'),
        params:
          {
            token: token,
            features: JSON.stringify([feature]),
            f: 'json'
          }
        }).success(function (data) {
        deferred.resolve(data);
      });
      return deferred.promise;
    }
  }]);;