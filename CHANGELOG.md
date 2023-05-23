# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [0.6.0]

### Added

- plugin state API

### Changed

- title styles

## [0.5.0]

### Added

- the ability to set the settings from the request

### Fixed

- if there is a title at small panel sizes, the value is out of view
- if the value is greater than the range, the color of the value is the same as the color of the last range

## [0.4.1]

### Fixed
- missing click event

## [0.4.0]

### Added

- scaling on panel resize
- click event when clicking on the gauge segment
- added notification if the value is outside the boundaries

## Changed

- version of DTCD-SDK

## [0.3.0]

## Added

- logging
- missing data message

## Changed

- layout styles
- panel config logic

## [0.2.0]

### Added

- version of core systems for adapters

### Changed

- build process in order to make directory name with current version of plugin

### Fixed

- correct visualization display when the container size is `N x N`

## [0.1.0]

### Added

- plugin init
- plugin datasource subscribe events
- tests init

### Changed

- plugin config dumping
- plugin datasource binding
- plugin settings form
