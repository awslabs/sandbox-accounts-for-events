# Changelog
All notable changes to this project will be documented in this file.


## [1.1.2] - 2024-03-08
### Added
- no additions

### Changed
- changed DCE Lambda runtimes from (deprecated) Go1.x to AmazonLinux2
- removed dependency to moreutils package (no longer available in AmazonLinux2023) from amplify.yml 

### Removed
- nothing removed


## [1.1.1] - 2024-03-07
### Added
- added AWS CLI credentials copy & paste functionality to AWS Account login popup

### Changed
- updated Amplify CLI version to v12.7.1
- updated Lambda runtimes to python3.12

### Removed
- removed unused code block leftover in Event Details page


## [1.1.0] - 2023-11-04
### Added
- no additions

### Changed
- updated Lambda functions to Node18 and aws-sdk v3
- Security upgrade: Blocked ListEvents API call for end users to remove potential data leak
- Security upgrade: Blocked API calls requesting an AWS account for a non-existent event id
- Security upgrade: Reduced number of possible parameters for end user API calls to necessary minimum, retrieve event management metadata from backend and auth token only

### Removed
- nothing removed


## [1.0.0] - 2022-06-10
### Added
- Initial release

### Changed
- no changes

### Removed
- nothing removed

