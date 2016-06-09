app.controller('servicesController', ['$state', '$scope', '$cookies', 'UserAuthService', 'GetRequestService', 'PostRequestService',
	function($state, $scope, $cookies, UserAuthService, GetRequestService, PostRequestService) {

	GetRequestService.getLabServices().then(function(data) {
		// get a current list of services from the api
		$scope.services = data;
	});

	$scope.submitForm = function(formType) {
		UserAuthService.checkToken().then(function(data) {
			if (data.success == "validated") {
				GetRequestService.getUsername().then(function(data) {
					PostRequestService.postSampleData(formType, data.username, $scope.formData).then(function(data) {
						if (data == "ok") {
							$state.go('payment');
						} else {
							$state.go('services.error', { problem: 'postingForm' });
						}
					});
				});
			} else {
				$state.go('services.error', { problem: 'login' });
			}
		});
	}

	$scope.autoFill = function(type) {
		// for demonstration purposes, this function fills out the form with some dummy info
		if (type == 'soil') {
			$scope.formData =
			{
				location: "a home garden plot",
				address: "3423 Piedmont Rd NE, Atlanta, GA 30305",
				county: "Fulton",
				homeGarden: 1
			};
		} else if (type == 'water') {
			$scope.formData =
			{
				address: "859 Spring St NW, Atlanta, GA 30308",
				county: "Fulton",
				sampleType: "householdWell",
				wellDepth: 25,
				wellCasingDiam: 18,
				endUse: "drinking",
				testReasons: "granite bedrock and old pipes",
				Iron: 1,
				Lead: 1,
				Radon: 1,
				Uranium: 1
			};
		}
	}
}]);