pipeline {
  agent any

  options {
    timeout(time: 60, unit: 'MINUTES')
  }

  stages {
    stage('Install') {
      steps {
        sh 'npm ci'
        sh 'npx playwright install --with-deps'
      }
    }

    stage('Test') {
      steps {
        sh 'npm run test:jenkins'
      }
    }
  }

  post {
    always {
      junit allowEmptyResults: true, testResults: 'test-results/junit.xml'
      archiveArtifacts allowEmptyArchive: true, artifacts: 'playwright-report/**, test-results/**'
    }
  }
}
