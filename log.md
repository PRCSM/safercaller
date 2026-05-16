Running 'gradlew :app:assembleDebug' in /home/expo/workingdir/build/android
Downloading https://services.gradle.org/distributions/gradle-8.14.3-bin.zip
10%.
20%
30%.
40%.
50%.
60%
70%
80%.
90%.
100%
Welcome to Gradle 8.14.3!
Here are the highlights of this release:
- Java 24 support
 - GraalVM Native Image toolchain selection
 - Enhancements to test reporting
 - Build Authoring improvements
For more details see https://docs.gradle.org/8.14.3/release-notes.html
To honour the JVM settings for this build a single-use Daemon process will be forked. For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/gradle_daemon.html#sec:disabling_the_daemon in the Gradle documentation.
Daemon will be stopped at the end of the build
> Configure project :expo-gradle-plugin:expo-autolinking-plugin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-plugin/build.gradle.kts:25:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Configure project :expo-gradle-plugin:expo-autolinking-settings-plugin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-autolinking/android/expo-gradle-plugin/expo-autolinking-settings-plugin/build.gradle.kts:30:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:shared:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:settings-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:pluginDescriptors
> Task :gradle-plugin:settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:processResources NO-SOURCE
> Task :gradle-plugin:shared:compileKotlin
> Task :gradle-plugin:shared:compileJava NO-SOURCE
> Task :gradle-plugin:shared:classes UP-TO-DATE
> Task :gradle-plugin:shared:jar
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:classes UP-TO-DATE
> Task :expo-gradle-plugin:expo-autolinking-plugin-shared:jar
> Task :gradle-plugin:settings-plugin:compileKotlin
> Task :gradle-plugin:settings-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:settings-plugin:classes
> Task :gradle-plugin:settings-plugin:jar
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-settings-plugin:jar
> Configure project :expo-dev-launcher-gradle-plugin
w: file:///home/expo/workingdir/build/node_modules/expo-dev-launcher/expo-dev-launcher-gradle-plugin/build.gradle.kts:25:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Configure project :expo-module-gradle-plugin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/expo-module-gradle-plugin/build.gradle.kts:58:3: 'kotlinOptions(KotlinJvmOptionsDeprecated /* = KotlinJvmOptions */.() -> Unit): Unit' is deprecated. Please migrate to the compilerOptions DSL. More details are here: https://kotl.in/u1r8ln
> Task :expo-gradle-plugin:expo-autolinking-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-launcher-gradle-plugin:checkKotlinGradlePluginConfigurationErrors
SKIPPED
> Task :expo-module-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :gradle-plugin:react-native-gradle-plugin:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-launcher-gradle-plugin:pluginDescriptors
> Task :expo-module-gradle-plugin:pluginDescriptors
> Task :expo-dev-launcher-gradle-plugin:processResources
> Task :expo-module-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:pluginDescriptors
> Task :expo-gradle-plugin:expo-autolinking-plugin:processResources
> Task :gradle-plugin:react-native-gradle-plugin:pluginDescriptors
> Task :gradle-plugin:react-native-gradle-plugin:processResources
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileKotlin
> Task :expo-gradle-plugin:expo-autolinking-plugin:compileJava NO-SOURCE
> Task :expo-gradle-plugin:expo-autolinking-plugin:classes
> Task :expo-gradle-plugin:expo-autolinking-plugin:jar
> Task :gradle-plugin:react-native-gradle-plugin:compileKotlin
> Task :gradle-plugin:react-native-gradle-plugin:compileJava NO-SOURCE
> Task :gradle-plugin:react-native-gradle-plugin:classes
> Task :gradle-plugin:react-native-gradle-plugin:jar
> Task :expo-dev-launcher-gradle-plugin:compileKotlin
> Task :expo-dev-launcher-gradle-plugin:compileJava NO-SOURCE
> Task :expo-dev-launcher-gradle-plugin:classes
> Task :expo-dev-launcher-gradle-plugin:jar
> Task :expo-module-gradle-plugin:compileKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/expo-module-gradle-plugin/src/main/kotlin/expo/modules/plugin/android/AndroidLibraryExtension.kt:9:24 'var targetSdk: Int?' is deprecated. Will be removed from library DSL in v9.0. Use testOptions.targetSdk or/and lint.targetSdk instead.
> Task :expo-module-gradle-plugin:compileJava NO-SOURCE
> Task :expo-module-gradle-plugin:classes
> Task :expo-module-gradle-plugin:jar
> Configure project :
[ExpoRootProject] Using the following versions:
- buildTools:  36.0.0
- minSdk:      24
- compileSdk:  35
- targetSdk:   35
- ndk:         27.1.12297006
- kotlin:      2.1.20
  - ksp:         2.1.20-2.0.1
> Configure project :app
 ℹ️  Applying gradle plugin 'expo-dev-launcher-gradle-plugin'
> Configure project :expo
Using expo modules
  - expo-constants (18.0.13)
  - expo-dev-client (6.0.21)
  - expo-dev-launcher (6.0.21)
- expo-dev-menu (7.0.19)
- expo-dev-menu-interface (2.0.0)
- expo-json-utils (0.15.0)
- expo-manifests (1.0.11)
- expo-modules-core (3.0.30)
- expo-updates-interface (2.0.0)
  - [📦] expo-asset (12.0.13)
  - [📦] expo-av (16.0.8)
  - [📦] expo-camera (17.0.10)
  - [📦] expo-document-picker (14.0.8)
  - [📦] expo-file-system (19.0.22)
  - [📦] expo-font (14.0.11)
  - [📦] expo-haptics (15.0.8)
  - [📦] expo-image-loader (6.0.0)
  - [📦] expo-image-picker (17.0.11)
  - [📦] expo-keep-awake (15.0.8)
  - [📦] expo-linear-gradient (15.0.8)
- [📦] expo-local-authentication (17.0.8)
  - [📦] expo-location (19.0.8)
  - [📦] expo-splash-screen (31.0.13)
> Configure project :react-native-firebase_app
:react-native-firebase_app package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/app/package.json
:react-native-firebase_app:firebase.bom using default value: 34.10.0
:react-native-firebase_app:play.play-services-auth using default value: 21.5.0
:react-native-firebase_app package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/app/package.json
:react-native-firebase_app:version set from package.json: 24.0.0 (24,0,0 - 24000000)
:react-native-firebase_app:android.compileSdk using custom value: 35
:react-native-firebase_app:android.targetSdk using custom value: 35
:react-native-firebase_app:android.minSdk using custom value: 24
:react-native-firebase_app:reactNativeAndroidDir /home/expo/workingdir/build/node_modules/react-native
> Configure project :react-native-firebase_auth
:react-native-firebase_auth package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/auth/package.json
:react-native-firebase_app package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/app/package.json
:react-native-firebase_auth:firebase.bom using default value: 34.10.0
:react-native-firebase_auth package.json found at /home/expo/workingdir/build/node_modules/@react-native-firebase/auth/package.json
:react-native-firebase_auth:version set from package.json: 24.0.0 (24,0,0 - 24000000)
:react-native-firebase_auth:android.compileSdk using custom value: 35
:react-native-firebase_auth:android.targetSdk using custom value: 35
:react-native-firebase_auth:android.minSdk using custom value: 24
:react-native-firebase_auth:reactNativeAndroidDir /home/expo/workingdir/build/node_modules/react-native
Checking the license for package Android SDK Build-Tools 36 in /home/expo/Android/Sdk/licenses
License for package Android SDK Build-Tools 36 accepted.
Preparing "Install Android SDK Build-Tools 36 v.36.0.0".
"Install Android SDK Build-Tools 36 v.36.0.0" ready.
Installing Android SDK Build-Tools 36 in /home/expo/Android/Sdk/build-tools/36.0.0
"Install Android SDK Build-Tools 36 v.36.0.0" complete.
"Install Android SDK Build-Tools 36 v.36.0.0" finished.
[=======================================] 100% Fetch remote repository...       
> Task :expo-dev-client:preBuild UP-TO-DATE
> Task :expo-dev-launcher:preBuild UP-TO-DATE
> Task :expo-dev-menu:preBuild UP-TO-DATE
> Task :expo-dev-menu-interface:preBuild UP-TO-DATE
> Task :expo-json-utils:preBuild UP-TO-DATE
> Task :expo-manifests:preBuild UP-TO-DATE
> Task :expo-modules-core:preBuild UP-TO-DATE
> Task :expo-updates-interface:preBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:generateCodegenSchemaFromJavaScript
> Task :expo-constants:createExpoConfig
> Task :expo-constants:preBuild
The NODE_ENV environment variable is required but was not specified. Ensure the project is bundled with Expo CLI or NODE_ENV is set. Using only .env.local and .env
> Task :expo:generatePackagesList
> Task :expo:preBuild
> Task :react-native-firebase_app:preBuild UP-TO-DATE
> Task :react-native-firebase_auth:preBuild UP-TO-DATE
> Task :react-native-async-storage_async-storage:generateCodegenArtifactsFromSchema
> Task :react-native-async-storage_async-storage:preBuild
> Task :react-native-reanimated:assertMinimalReactNativeVersionTask
> Task :react-native-reanimated:assertNewArchitectureEnabledTask SKIPPED
> Task :react-native-reanimated:assertWorkletsVersionTask
> Task :react-native-gesture-handler:generateCodegenSchemaFromJavaScript
> Task :react-native-community_datetimepicker:generateCodegenSchemaFromJavaScript
> Task :react-native-reanimated:generateCodegenSchemaFromJavaScript
> Task :react-native-community_datetimepicker:generateCodegenArtifactsFromSchema
> Task :react-native-community_datetimepicker:preBuild
> Task :react-native-gesture-handler:generateCodegenArtifactsFromSchema
> Task :react-native-gesture-handler:preBuild
> Task :react-native-reanimated:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:generateCodegenSchemaFromJavaScript
> Task :react-native-screens:generateCodegenSchemaFromJavaScript
> Task :react-native-reanimated:prepareReanimatedHeadersForPrefabs
> Task :react-native-reanimated:preBuild
> Task :react-native-safe-area-context:generateCodegenArtifactsFromSchema
> Task :react-native-safe-area-context:preBuild
> Task :react-native-screens:generateCodegenArtifactsFromSchema
> Task :react-native-screens:preBuild
> Task :react-native-worklets:assertMinimalReactNativeVersionTask
> Task :react-native-worklets:assertNewArchitectureEnabledTask
SKIPPED
> Task :react-native-svg:generateCodegenSchemaFromJavaScript
> Task :react-native-worklets:generateCodegenSchemaFromJavaScript
> Task :react-native-svg:generateCodegenArtifactsFromSchema
> Task :react-native-svg:preBuild
> Task :react-native-worklets:generateCodegenArtifactsFromSchema
> Task :expo:preDebugBuild
> Task :react-native-worklets:prepareWorkletsHeadersForPrefabs
> Task :react-native-worklets:preBuild
> Task :expo-constants:preDebugBuild
> Task :expo:writeDebugAarMetadata
> Task :expo-constants:writeDebugAarMetadata
> Task :expo-dev-client:preDebugBuild UP-TO-DATE
> Task :expo-dev-launcher:preDebugBuild UP-TO-DATE
> Task :expo-dev-launcher:writeDebugAarMetadata
> Task :expo-dev-client:writeDebugAarMetadata
> Task :expo-dev-menu:preDebugBuild UP-TO-DATE
> Task :expo-dev-menu-interface:preDebugBuild UP-TO-DATE
> Task :expo-dev-menu-interface:writeDebugAarMetadata
> Task :expo-json-utils:preDebugBuild UP-TO-DATE
> Task :expo-dev-menu:writeDebugAarMetadata
> Task :expo-manifests:preDebugBuild UP-TO-DATE
> Task :expo-json-utils:writeDebugAarMetadata
> Task :expo-modules-core:preDebugBuild UP-TO-DATE
> Task :expo-manifests:writeDebugAarMetadata
> Task :expo-updates-interface:preDebugBuild UP-TO-DATE
> Task :expo-modules-core:writeDebugAarMetadata
> Task :react-native-async-storage_async-storage:preDebugBuild
> Task :react-native-async-storage_async-storage:writeDebugAarMetadata
> Task :expo-updates-interface:writeDebugAarMetadata
> Task :react-native-community_datetimepicker:preDebugBuild
> Task :react-native-firebase_app:preDebugBuild UP-TO-DATE
> Task :react-native-community_datetimepicker:writeDebugAarMetadata
> Task :react-native-firebase_auth:preDebugBuild UP-TO-DATE
> Task :react-native-firebase_app:writeDebugAarMetadata
> Task :react-native-gesture-handler:preDebugBuild
> Task :react-native-firebase_auth:writeDebugAarMetadata
> Task :react-native-reanimated:preDebugBuild
> Task :react-native-gesture-handler:writeDebugAarMetadata
> Task :react-native-safe-area-context:preDebugBuild
> Task :react-native-reanimated:writeDebugAarMetadata
> Task :react-native-screens:preDebugBuild
> Task :react-native-safe-area-context:writeDebugAarMetadata
> Task :react-native-svg:preDebugBuild
> Task :react-native-screens:writeDebugAarMetadata
> Task :react-native-worklets:preDebugBuild
> Task :react-native-svg:writeDebugAarMetadata
> Task :react-native-worklets:writeDebugAarMetadata
> Task :expo:generateDebugResValues
> Task :expo-constants:generateDebugResValues
> Task :expo:generateDebugResources
> Task :expo-constants:generateDebugResources
> Task :expo-constants:packageDebugResources
> Task :expo:packageDebugResources
> Task :expo-dev-client:generateDebugResValues
> Task :expo-dev-launcher:generateDebugResValues
> Task :expo-dev-client:generateDebugResources
> Task :expo-dev-launcher:generateDebugResources
> Task :expo-dev-client:packageDebugResources
> Task :expo-dev-menu:generateDebugResValues
> Task :expo-dev-menu:generateDebugResources
> Task :expo-dev-launcher:packageDebugResources
> Task :expo-dev-menu:packageDebugResources
> Task :expo-dev-menu-interface:generateDebugResValues
> Task :expo-json-utils:generateDebugResValues
> Task :expo-dev-menu-interface:generateDebugResources
> Task :expo-json-utils:generateDebugResources
> Task :expo-dev-menu-interface:packageDebugResources
> Task :expo-json-utils:packageDebugResources
> Task :expo-manifests:generateDebugResValues
> Task :expo-modules-core:generateDebugResValues
> Task :expo-manifests:generateDebugResources
> Task :expo-modules-core:generateDebugResources
> Task :expo-manifests:packageDebugResources
> Task :expo-modules-core:packageDebugResources
> Task :expo-updates-interface:generateDebugResValues
> Task :react-native-async-storage_async-storage:generateDebugResValues
> Task :expo-updates-interface:generateDebugResources
> Task :react-native-async-storage_async-storage:generateDebugResources
> Task :react-native-async-storage_async-storage:packageDebugResources
> Task :expo-updates-interface:packageDebugResources
> Task :react-native-community_datetimepicker:generateDebugResValues
> Task :react-native-firebase_app:generateDebugResValues
> Task :react-native-firebase_app:generateDebugResources
> Task :react-native-community_datetimepicker:generateDebugResources
> Task :react-native-firebase_app:packageDebugResources
> Task :react-native-firebase_auth:generateDebugResValues
> Task :react-native-firebase_auth:generateDebugResources
> Task :react-native-community_datetimepicker:packageDebugResources
> Task :react-native-gesture-handler:generateDebugResValues
> Task :react-native-gesture-handler:generateDebugResources
> Task :react-native-firebase_auth:packageDebugResources
> Task :react-native-gesture-handler:packageDebugResources
> Task :react-native-reanimated:generateDebugResValues
> Task :react-native-safe-area-context:generateDebugResValues
> Task :react-native-reanimated:generateDebugResources
> Task :react-native-safe-area-context:generateDebugResources
> Task :react-native-reanimated:packageDebugResources
> Task :react-native-safe-area-context:packageDebugResources
> Task :react-native-svg:generateDebugResValues
> Task :react-native-screens:generateDebugResValues
> Task :react-native-svg:generateDebugResources
> Task :react-native-svg:packageDebugResources
> Task :react-native-screens:generateDebugResources
> Task :react-native-worklets:generateDebugResValues
> Task :react-native-worklets:generateDebugResources
> Task :react-native-worklets:packageDebugResources
> Task :expo:extractDeepLinksDebug
> Task :react-native-screens:packageDebugResources
> Task :expo-constants:extractDeepLinksDebug
> Task :expo-constants:processDebugManifest
> Task :expo:processDebugManifest
> Task :expo-dev-launcher:extractDeepLinksDebug
> Task :expo-dev-client:extractDeepLinksDebug
> Task :expo-dev-client:processDebugManifest
> Task :expo-dev-menu:extractDeepLinksDebug
> Task :expo-dev-menu:processDebugManifest
> Task :expo-dev-menu-interface:extractDeepLinksDebug
> Task :expo-dev-launcher:processDebugManifest
> Task :expo-json-utils:extractDeepLinksDebug
> Task :expo-dev-menu-interface:processDebugManifest
> Task :expo-manifests:extractDeepLinksDebug
> Task :expo-json-utils:processDebugManifest
> Task :expo-manifests:processDebugManifest
> Task :expo-modules-core:extractDeepLinksDebug
> Task :expo-updates-interface:extractDeepLinksDebug
> Task :expo-modules-core:processDebugManifest
/home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/AndroidManifest.xml:8:9-11:45 Warning:
	meta-data#com.facebook.soloader.enabled@android:value was tagged at AndroidManifest.xml:8 to replace other declarations but no other declaration present
> Task :react-native-async-storage_async-storage:extractDeepLinksDebug
> Task :react-native-async-storage_async-storage:processDebugManifest
package="com.reactnativecommunity.asyncstorage" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.reactnativecommunity.asyncstorage" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/main/AndroidManifest.xml.
> Task :expo-updates-interface:processDebugManifest
> Task :react-native-community_datetimepicker:extractDeepLinksDebug
> Task :react-native-firebase_app:extractDeepLinksDebug
> Task :react-native-community_datetimepicker:processDebugManifest
> Task :react-native-firebase_app:processDebugManifest
package="io.invertase.firebase" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/app/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.invertase.firebase" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/app/android/src/main/AndroidManifest.xml.
> Task :react-native-firebase_auth:extractDeepLinksDebug
> Task :react-native-gesture-handler:extractDeepLinksDebug
> Task :react-native-gesture-handler:processDebugManifest
> Task :react-native-firebase_auth:processDebugManifest
package="io.invertase.firebase.auth" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/auth/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="io.invertase.firebase.auth" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/@react-native-firebase/auth/android/src/main/AndroidManifest.xml.
> Task :react-native-reanimated:extractDeepLinksDebug
> Task :react-native-safe-area-context:extractDeepLinksDebug
> Task :react-native-reanimated:processDebugManifest
> Task :react-native-safe-area-context:processDebugManifest
package="com.th3rdwave.safeareacontext" found in source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
Setting the namespace via the package attribute in the source AndroidManifest.xml is no longer supported, and the value is ignored.
Recommendation: remove package="com.th3rdwave.safeareacontext" from the source AndroidManifest.xml: /home/expo/workingdir/build/node_modules/react-native-safe-area-context/android/src/main/AndroidManifest.xml.
> Task :react-native-screens:extractDeepLinksDebug
> Task :react-native-svg:extractDeepLinksDebug
> Task :react-native-screens:processDebugManifest
> Task :react-native-worklets:extractDeepLinksDebug
> Task :react-native-svg:processDebugManifest
> Task :react-native-worklets:processDebugManifest
> Task :expo-dev-client:compileDebugLibraryResources
> Task :expo-constants:compileDebugLibraryResources
> Task :expo:compileDebugLibraryResources
> Task :expo:parseDebugLocalResources
> Task :expo-constants:parseDebugLocalResources
> Task :expo-dev-client:parseDebugLocalResources
> Task :expo:generateDebugRFile
> Task :expo-constants:generateDebugRFile
> Task :expo-dev-client:generateDebugRFile
> Task :expo-dev-menu-interface:compileDebugLibraryResources
> Task :expo-dev-launcher:parseDebugLocalResources
> Task :expo-dev-launcher:compileDebugLibraryResources
> Task :expo-dev-menu:compileDebugLibraryResources
> Task :expo-dev-menu:parseDebugLocalResources
> Task :expo-dev-launcher:generateDebugRFile
> Task :expo-json-utils:compileDebugLibraryResources
> Task :expo-json-utils:parseDebugLocalResources
> Task :expo-dev-menu:generateDebugRFile
> Task :expo-dev-menu-interface:parseDebugLocalResources
> Task :expo-manifests:compileDebugLibraryResources
> Task :expo-json-utils:generateDebugRFile
> Task :expo-dev-menu-interface:generateDebugRFile
> Task :expo-manifests:parseDebugLocalResources
> Task :expo-manifests:generateDebugRFile
> Task :expo-updates-interface:compileDebugLibraryResources
> Task :expo-modules-core:parseDebugLocalResources
> Task :expo-modules-core:compileDebugLibraryResources
> Task :expo-modules-core:generateDebugRFile
> Task :expo-updates-interface:parseDebugLocalResources
> Task :react-native-async-storage_async-storage:compileDebugLibraryResources
> Task :react-native-community_datetimepicker:compileDebugLibraryResources
> Task :react-native-async-storage_async-storage:parseDebugLocalResources
> Task :expo-updates-interface:generateDebugRFile
> Task :react-native-community_datetimepicker:parseDebugLocalResources
> Task :react-native-async-storage_async-storage:generateDebugRFile
> Task :react-native-firebase_app:compileDebugLibraryResources
> Task :react-native-community_datetimepicker:generateDebugRFile
> Task :react-native-firebase_app:parseDebugLocalResources
> Task :react-native-gesture-handler:compileDebugLibraryResources
> Task :react-native-firebase_auth:compileDebugLibraryResources
> Task :react-native-gesture-handler:parseDebugLocalResources
> Task :react-native-firebase_app:generateDebugRFile
> Task :react-native-firebase_auth:parseDebugLocalResources
> Task :react-native-reanimated:compileDebugLibraryResources
> Task :react-native-firebase_auth:generateDebugRFile
> Task :react-native-gesture-handler:generateDebugRFile
> Task :react-native-reanimated:parseDebugLocalResources
> Task :react-native-safe-area-context:compileDebugLibraryResources
> Task :react-native-safe-area-context:parseDebugLocalResources
> Task :react-native-reanimated:generateDebugRFile
> Task :react-native-screens:parseDebugLocalResources
> Task :react-native-screens:compileDebugLibraryResources
> Task :react-native-safe-area-context:generateDebugRFile
> Task :react-native-svg:compileDebugLibraryResources
> Task :react-native-screens:generateDebugRFile
> Task :react-native-worklets:compileDebugLibraryResources
> Task :expo:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-svg:parseDebugLocalResources
> Task :expo:generateDebugBuildConfig
> Task :expo-constants:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-worklets:parseDebugLocalResources
> Task :expo-constants:generateDebugBuildConfig
> Task :expo-modules-core:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-modules-core:generateDebugBuildConfig
> Task :react-native-worklets:generateDebugRFile
> Task :react-native-svg:generateDebugRFile
> Task :expo-dev-client:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-constants:javaPreCompileDebug
> Task :expo-dev-launcher:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-client:dataBindingMergeDependencyArtifactsDebug
> Task :expo-modules-core:javaPreCompileDebug
> Task :expo-dev-client:dataBindingGenBaseClassesDebug
> Task :expo-dev-client:generateDebugBuildConfig
> Task :expo-dev-client:javaPreCompileDebug
> Task :expo-dev-menu:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-menu:generateDebugBuildConfig
> Task :expo-dev-menu-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-dev-menu-interface:generateDebugBuildConfig
> Task :expo-dev-menu-interface:javaPreCompileDebug
> Task :expo-json-utils:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-json-utils:generateDebugBuildConfig
> Task :expo-json-utils:javaPreCompileDebug
> Task :expo-manifests:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-manifests:generateDebugBuildConfig
> Task :expo-manifests:javaPreCompileDebug
> Task :expo-dev-menu:javaPreCompileDebug
> Task :expo-updates-interface:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :expo-updates-interface:generateDebugBuildConfig
> Task :expo-updates-interface:javaPreCompileDebug
> Task :expo:javaPreCompileDebug
> Task :react-native-async-storage_async-storage:generateDebugBuildConfig
> Task :react-native-async-storage_async-storage:javaPreCompileDebug
> Task :app:generateAutolinkingNewArchitectureFiles
> Task :app:generateAutolinkingPackageList
> Task :app:generateCodegenSchemaFromJavaScript SKIPPED
> Task :app:generateCodegenArtifactsFromSchema SKIPPED
> Task :app:generateReactNativeEntryPoint
> Task :app:preBuild
> Task :app:preDebugBuild
> Task :app:mergeDebugNativeDebugMetadata NO-SOURCE
> Task :app:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :app:generateDebugBuildConfig
> Task :react-native-async-storage_async-storage:compileDebugJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/expo/workingdir/build/node_modules/@react-native-async-storage/async-storage/android/src/javaPackage/java/com/reactnativecommunity/asyncstorage/AsyncStoragePackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :expo-dev-launcher:dataBindingMergeDependencyArtifactsDebug
> Task :react-native-async-storage_async-storage:bundleLibCompileToJarDebug
> Task :react-native-community_datetimepicker:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-community_datetimepicker:generateDebugBuildConfig
> Task :expo-dev-launcher:dataBindingGenBaseClassesDebug
> Task :expo-dev-launcher:generateDebugBuildConfig
> Task :expo-dev-launcher:checkApolloVersions
> Task :expo-dev-launcher:generateServiceApolloOptions
> Task :expo-dev-launcher:generateServiceApolloSources
w: /home/expo/workingdir/build/node_modules/expo-dev-launcher/android/src/main/graphql/GetBranches.graphql: (21, 11): Apollo: Use of deprecated field `runtimeVersion`
w: /home/expo/workingdir/build/node_modules/expo-dev-launcher/android/src/main/graphql/GetBranches.graphql: (34, 3): Apollo: Variable `platform` is unused
w: /home/expo/workingdir/build/node_modules/expo-dev-launcher/android/src/main/graphql/GetUpdates.graphql: (14, 11): Apollo: Use of deprecated field `runtimeVersion`
> Task :expo-dev-launcher:javaPreCompileDebug
> Task :react-native-community_datetimepicker:javaPreCompileDebug
> Task :react-native-firebase_app:generateDebugBuildConfig
> Task :react-native-firebase_app:javaPreCompileDebug
> Task :react-native-community_datetimepicker:compileDebugKotlin
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialDatePickerModule.kt:21:20 'val currentActivity: Activity?' is deprecated. Deprecated in 0.80.0. Use getReactApplicationContext.getCurrentActivity() instead.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialDatePickerModule.kt:21:20 This synthetic property is based on the getter function 'fun getCurrentActivity(): Activity?' from Kotlin. In the future, synthetic properties will be available only if the base getter function came from Java. Consider replacing this property access with a 'getCurrentActivity()' function call.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialDatePickerModule.kt:26:20 'val currentActivity: Activity?' is deprecated. Deprecated in 0.80.0. Use getReactApplicationContext.getCurrentActivity() instead.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialDatePickerModule.kt:26:20 This synthetic property is based on the getter function 'fun getCurrentActivity(): Activity?' from Kotlin. In the future, synthetic properties will be available only if the base getter function came from Java. Consider replacing this property access with a 'getCurrentActivity()' function call.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialTimePickerModule.kt:22:20 'val currentActivity: Activity?' is deprecated. Deprecated in 0.80.0. Use getReactApplicationContext.getCurrentActivity() instead.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialTimePickerModule.kt:22:20 This synthetic property is based on the getter function 'fun getCurrentActivity(): Activity?' from Kotlin. In the future, synthetic properties will be available only if the base getter function came from Java. Consider replacing this property access with a 'getCurrentActivity()' function call.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialTimePickerModule.kt:27:20 'val currentActivity: Activity?' is deprecated. Deprecated in 0.80.0. Use getReactApplicationContext.getCurrentActivity() instead.
w: file:///home/expo/workingdir/build/node_modules/@react-native-community/datetimepicker/android/src/main/java/com/reactcommunity/rndatetimepicker/MaterialTimePickerModule.kt:27:20 This synthetic property is based on the getter function 'fun getCurrentActivity(): Activity?' from Kotlin. In the future, synthetic properties will be available only if the base getter function came from Java. Consider replacing this property access with a 'getCurrentActivity()' function call.
> Task :react-native-firebase_app:compileDebugJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-community_datetimepicker:compileDebugJavaWithJavac
> Task :react-native-community_datetimepicker:bundleLibCompileToJarDebug
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
> Task :react-native-firebase_auth:generateDebugBuildConfig
> Task :react-native-firebase_auth:javaPreCompileDebug
> Task :react-native-gesture-handler:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-gesture-handler:generateDebugBuildConfig
> Task :react-native-reanimated:generateDebugBuildConfig
> Task :react-native-firebase_app:bundleLibCompileToJarDebug
> Task :react-native-reanimated:javaPreCompileDebug
> Task :react-native-worklets:checkKotlinGradlePluginConfigurationErrors SKIPPED
> Task :react-native-worklets:generateDebugBuildConfig
> Task :react-native-worklets:compileDebugKotlin NO-SOURCE
> Task :react-native-worklets:javaPreCompileDebug
> Task :react-native-firebase_auth:compileDebugJavaWithJavac
Note: Some input files use or override a deprecated API.
Note: Recompile with -Xlint:deprecation for details.
Note: /home/expo/workingdir/build/node_modules/@react-native-firebase/auth/android/src/main/java/io/invertase/firebase/auth/ReactNativeFirebaseAuthModule.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :app:checkDebugAarMetadata FAILED
> Task :react-native-worklets:compileDebugJavaWithJavac
Note: /home/expo/workingdir/build/node_modules/react-native-worklets/android/src/main/java/com/swmansion/worklets/WorkletsPackage.java uses unchecked or unsafe operations.
Note: Recompile with -Xlint:unchecked for details.
> Task :expo-modules-core:compileDebugKotlin
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:48:87 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:91:85 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/adapters/react/apploader/RNHeadlessAppLoader.kt:120:83 'val reactNativeHost: ReactNativeHost' is deprecated. You should not use ReactNativeHost directly in the New Architecture. Use ReactHost instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/apploader/AppLoaderProvider.kt:34:52 Unchecked cast of 'Class<*>!' to 'Class<out HeadlessAppLoader>'.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:30:8 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:253:21 'typealias ErrorManagerModule = JSLoggerModule' is deprecated. Use JSLoggerModule instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/AppContext.kt:343:21 'val DEFAULT: Int' is deprecated. UIManagerType.DEFAULT will be deleted in the next release of React Native. Use [LEGACY] instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/defaultmodules/NativeModulesProxyModule.kt:16:5 'fun Constants(legacyConstantsProvider: () -> Map<String, Any?>): Unit' is deprecated. Use `Constant` or `Property` instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:65:51 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/jni/PromiseImpl.kt:69:22 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewDefinitionBuilder.kt:464:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:16 'val errorManager: JSLoggerModule?' is deprecated. Use AppContext.jsLogger instead.
w: file:///home/expo/workingdir/build/node_modules/expo-modules-core/android/src/main/java/expo/modules/kotlin/views/ViewManagerDefinition.kt:41:30 'fun reportExceptionToLogBox(codedException: CodedException): Unit' is deprecated. Use appContext.jsLogger.error(...) instead.
[Incubating] Problems report is available at: file:///home/expo/workingdir/build/android/build/reports/problems/problems-report.html
FAILURE:
Build failed with an exception.
* What went wrong:
Execution failed for task ':app:checkDebugAarMetadata'.
> A failure occurred while executing com.android.build.gradle.internal.tasks.CheckAarMetadataWorkAction
   > 2 issues were found when checking AAR metadata:
     
       1.  Dependency 'androidx.core:core-ktx:1.17.0' requires libraries and applications that
           depend on it to compile against version 36 or later of the
           Android APIs.
     
           :app is currently compiled against android-35.
     
           Recommended action: Update this project to use a newer compileSdk
           of at least 36, for example 36.
Note that updating a library or application's compileSdk (which
           allows newer APIs to be used) can be done separately from updating
           targetSdk (which opts the app in to new runtime behavior) and
           minSdk (which determines which devices the app can be installed
           on).
     
       2.  Dependency 'androidx.core:core:1.17.0' requires libraries and applications that
           depend on it to compile against version 36 or later of the
           Android APIs.
     
           :app is currently compiled against android-35.
     
           Recommended action: Update this project to use a newer compileSdk
           of at least 36, for example 36.
     
           Note that updating a library or application's compileSdk (which
allows newer APIs to be used) can be done separately from updating
           targetSdk (which opts the app in to new runtime behavior) and
           minSdk (which determines which devices the app can be installed
           on).
* Try:
> Run with --stacktrace option to get the stack trace.
> Run with --info or --debug option to get more log output.
> Run with --scan to get full insights.
> Get more help at https://help.gradle.org.
BUILD FAILED in 2m 36s
Deprecated Gradle features were used in this build, making it incompatible with Gradle 9.0.
You can use '--warning-mode all' to show the individual deprecation warnings and determine if they come from your own scripts or plugins.
For more on this, please refer to https://docs.gradle.org/8.14.3/userguide/command_line_interface.html#sec:command_line_warnings in the Gradle documentation.
286 actionable tasks: 286 executed
Error: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.
Fail job

0ms


Build failed: Gradle build failed with unknown error. See logs for the "Run gradlew" phase for more information.