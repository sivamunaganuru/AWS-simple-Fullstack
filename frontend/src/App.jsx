import React from 'react';
import FileUpload from './pages/FileUpload';
import { Amplify } from 'aws-amplify';
import amplifyconfig from './amplifyconfiguration.json';
import { withAuthenticator, Button, Heading } from '@aws-amplify/ui-react';
import '@aws-amplify/ui-react/styles.css';

Amplify.configure(amplifyconfig);

const App = ({ signOut, user }) => {
  return (
    <FileUpload />
  )
}

export default withAuthenticator(App);