allprojects {
    repositories {
        google()
        mavenCentral()
    }
}

val newBuildDir: Directory =
    rootProject.layout.buildDirectory
        .dir("../../build")
        .get()
rootProject.layout.buildDirectory.value(newBuildDir)

subprojects {
    val newSubprojectBuildDir: Directory = newBuildDir.dir(project.name)
    project.layout.buildDirectory.value(newSubprojectBuildDir)
}
// objectbox_flutter_libs (offline map storage) still compiles against API 31, but the AndroidX
// libraries it pulls in need 33+. Compile it against 36; this doesn't change the minimum Android version.
subprojects {
    afterEvaluate {
        if (project.name == "objectbox_flutter_libs") {
            (extensions.findByName("android") as? com.android.build.gradle.BaseExtension)?.compileSdkVersion(36)
        }
    }
}
subprojects {
    project.evaluationDependsOn(":app")
}

tasks.register<Delete>("clean") {
    delete(rootProject.layout.buildDirectory)
}
