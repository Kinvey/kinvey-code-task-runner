## Changelog

### 2.1.0
* Added option to set request body size limit, and defaulted to 26 MB
* Fixed a concurrency issue in the TCP receiver that was causing unhandled exceptions to be swallowed and tasks to not complete properly when an unhandled exception occured.

### 2.0.0
* Add hookType to flex functions
* BREAKING:  Flex Function body argument `entityId` is now `id`.  

### v1.2.1
* Fix bug where receiver would crash if a null task object was received via the tcpReceiver stream

### v1.2.0
* Supports multiple auth endpoints that maps to individual auth handler functions

### v1.1.0
* Add mapping of auth endpoint mapping to http handler

### v1.0.0
* Fixed FlexFunctions and discoverMetadata taskTypes in http metadata

### v1.0.0-rc.1
* Fixed routing of discovery
* Allow functions to run externally

### v0.3.1
* BACK-1944: Fixed task receiver protocol bug (missing newline)

### v0.3.0
* Rewritten in ES2015
* Sets appMetadata and request.headers to empty objects if the headers for them aren't present

### v0.2.0
* Added http receiver to support external DLCs

### v0.1.3
* Added local file logger to hide `console.log()` debug prints
* Updated copyrights

### v0.1.2
* Updated license and copyrights

### v0.1.1
* Updated contributors

### v0.1.0
* Initial Release
