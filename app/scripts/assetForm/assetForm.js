angular
  .module('assetFormApp')
  .directive('assetForm', ['assets', 'login', function (assets, login) {
    return {
      require: '^?loginForm',
      restrict: 'E',
      templateUrl: 'scripts/assetForm/assetForm.html',
      controller: function ($scope, $timeout, $window, login) {
        $scope.toggleGrayout = function (show) {
          $('#fakeModal').modal(((show) ? 'show' : 'hide'));
          console.log(((show) ? 'show' : 'hide'));
        }
        var getTypes = function (token, id) {
             assets.getTypes($scope.token, id).then(function (data) {
              if (data.error) {
                if (data.error.code === 498) {
                  login.login($scope.user, $scope.password).then(function (token) {
                    $scope.token = token;
                    getTypes(token, id);
                  });
                }
              } else {
                $scope.tableData = data;
                $scope.fields = [];
                $scope.types = data.types;                
              }
            });         
        }        
        $scope.siteSelected = function () {
          var flds = $scope.fields.filter(function (f) {
            return f.name === 'SITE' || f.name === 'LOCATION';
          });
          if (flds.length > 0) {
            angular.forEach(flds, function (f) {
              if (f.name === 'SITE') {
                $scope.site = f.value;
                $scope.buildings = f.value.buildings;                
              } else if (f.name === 'LOCATION') {
                f.value = undefined;
              }
            });
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

        var getSites = function (token) {
            assets.getSites(token).then(function (data) {
              $scope.sites = [];
              var siteNames = [];
              var bldgs = [];
              angular.forEach(data.features, function (f) {
                if (siteNames.indexOf(f.attributes.SITE) === -1) {
                  $scope.sites.push({name: f.attributes.SITE, id: parseInt(f.attributes.FACILITYID), buildings:[{name: f.attributes.LOCATION, id: parseInt(f.attributes.FACILITYID), address: f.attributes.LEGACYID}]})
                  siteNames.push(f.attributes.SITE);
                } else {
                  var site = $scope.sites.filter(function (s) {
                    return s.name === f.attributes.SITE;
                  });
                  if (site.length > 0) {
                    site = site[0];
                    site.buildings.push({name: f.attributes.LOCATION, id: parseInt(f.attributes.FACILITYID), address: f.attributes.LEGACYID});
                  }
                }
              });
            });
        };

        $scope.$watch('token', function (token) {
          if (token) {
            $scope.toggleGrayout(true);
            assets.getTables(token).then(function (data) {
              $scope.toggleGrayout(false);
              $scope.tables = data.tables;
              getSites(token);
            });
            
          }
        });
        $scope.tableSelected = function (id) {
          getTypes($scope.token, id);
        };



        $scope.typeSelected = function (type) {
          console.log($scope.fields);
          angular.forEach($scope.tableData.fields, function (f) {
            if (type.domains[f.name]) {
              if (type.domains[f.name].codedValues) {
                f.domain = type.domains[f.name];
              }
            }
            console.log(f.name);
            console.log(f.nullable);
          });
          $scope.fields = $scope.tableData.fields;
          $scope.clearForm(false);
        };
        $scope.dateInit = function (e) {
          $('.date').datepicker({clearBtn: true});
        };
        $scope.inputBlur = function (field) {
          if (field.name == 'ASSET_TAG') {

            $scope.facilityid = field.value;
            $scope.oid = null;
            checkAssetExists($scope.token, field, $scope.table.id);
          }
        }

        var checkAssetExists = function (token, field, id) {
            $scope.toggleGrayout(true);
            assets.checkAssetExists(token, field.value, id).then(function (data) {
              $scope.toggleGrayout(false);
              console.log(data);
              if (data.error) {
                if (data.error.code === 498) {
                  login.login($scope.user, $scope.password).then(function (token) {
                    $scope.token = token;
                    checkAssetExists($scope.token, field, $scope.table.id);
                  });
                }
              } else if (data.features.length > 0) {
                $scope.oid = data.features[0].attributes.OBJECTID;
                setFieldValues(data.features[0].attributes);
                showMessage("warning", "Asset with this tag has already been created, changes will update the existing asset")
              } else {
                $scope.alert = null;
              }
            }, function (status, data) {
              $scope.toggleGrayout(false);
            });
        };

        var setFieldValues = function (attributes) {
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
          $scope.processing = true;
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
          submitAsset($scope.token, feature, $scope.table.id, $scope.oid);
        };

        var submitAsset = function(token, feature, id, oid) {
          $scope.processing = true;
          $scope.toggleGrayout(true);
          assets.submitAsset(token, feature, id, oid).then(function (data) {
            $scope.processing = false;
            $scope.toggleGrayout(false);
            console.log(data);
            var success = false;
              if (data.error) {
                if (data.error.code === 498) {
                  login.login($scope.user, $scope.password).then(function (token) {
                    $scope.token = token;
                    submitAsset(token, feature, id, oid);
                  });
                }
              } else {
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
              }
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
      }).success(deferred.resolve)
      .error(deferred.resolve);
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
      }).success(deferred.resolve)
      .error(deferred.resolve);
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
      }).success(deferred.resolve)
      .error(deferred.resolve);
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
      }).success(deferred.resolve)
      .error(deferred.resolve);
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
        }).success(deferred.resolve)
      .error(deferred.resolve);
      return deferred.promise;
    }
  }]);