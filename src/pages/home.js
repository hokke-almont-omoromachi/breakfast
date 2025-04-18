import React from 'react';
import { Link } from 'react-router-dom';

function Home() {
  return (
    <div>
      <h1>Welcome to the Home Page</h1>
      <nav>
        <ul>
          <li><Link to="/restaurant">Restaurant</Link></li>
          <li><Link to="/guest">Guest</Link></li>
        </ul>
      </nav>
    </div>
  );
}

export default Home;