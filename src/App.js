import React, { Component } from 'react';
import logo from './logo.svg';
import './App.css';

import { ApolloLink } from 'apollo-link';
import { ApolloClient } from 'apollo-client';
import { ApolloProvider } from 'react-apollo'
import { HttpLink } from 'apollo-link-http';
import { InMemoryCache } from 'apollo-cache-inmemory';
import ActionCable from 'actioncable';
import ActionCableLink from 'graphql-ruby-client/subscriptions/ActionCableLink';
import { Query } from 'react-apollo'
import gql from 'graphql-tag'

const cable = ActionCable.createConsumer('ws://localhost:3001/cable')

const httpLink = new HttpLink({
  uri: 'http://localhost:3001/graphql',
  // credentials: 'include'
});

const hasSubscriptionOperation = ({ query: { definitions } }) => {
  return definitions.some(
    ({ kind, operation }) => kind === 'OperationDefinition' && operation === 'subscription'
  )
}

const link = ApolloLink.split(
  hasSubscriptionOperation,
  new ActionCableLink({cable}),
  httpLink
);

const client = new ApolloClient({
  link: link,
  cache: new InMemoryCache()
});

const LINKS = gql`
  query {
    messages {
      id
      message
    }
  }
`

const SUBSCRIPTION = gql`
  subscription {
    newChatMessage {
      id
      message
    }
  }
`

class App extends Component {
  _subscribeToNewLinks = subscribeToMore => {
    subscribeToMore({
      document: SUBSCRIPTION,
      updateQuery: (prev, { subscriptionData }) => {
        console.log('subscriptionData: ', subscriptionData);
        if (!subscriptionData.data) return prev

        const newMessage = subscriptionData.data.newChatMessage

        return Object.assign({}, prev, {
          messages: [newMessage, ...prev.messages]
        })
      }
    })
  }

  render() {
    return (
      <ApolloProvider client={client}>
        <div className="App">
          <header className="App-header">
            <img src={logo} className="App-logo" alt="logo" />
            <p>
              Edit <code>src/App.js</code> and save to reload.
            </p>
            <a
              className="App-link"
              href="https://reactjs.org"
              target="_blank"
              rel="noopener noreferrer"
            >
              Learn React
            </a>
            <Query query={LINKS}>
          {({ loading, error, data, subscribeToMore }) => {
            if (loading) return <div>Loading...</div>
            if (error) return <div>Error</div>

            const listItems = data.messages.map((message) =>
              <li key={message.id}>{message.id}: {message.message}</li>
            );

            this._subscribeToNewLinks(subscribeToMore)

            return (
              <div>
                <h3>Message</h3>
                <div>
                  <ul>{listItems}</ul>
                </div>
              </div>
            )
          }}
        </Query>
          </header>
        </div>
      </ApolloProvider>
    );
  }
}

export default App;
