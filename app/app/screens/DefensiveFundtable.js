import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const DefensiveFundtable = () => {
  console.log("DefensiveFundtable: Component is mounting.");

  const [fundData, setFundData] = useState([]);
  console.log("DefensiveFundtable: fundData state initialized as empty array.");
  const [loading, setLoading] = useState(true);
  console.log("DefensiveFundtable: loading state initialized to true.");
  const [error, setError] = useState(null);
  console.log("DefensiveFundtable: error state initialized to null.");
  const [refreshing, setRefreshing] = useState(false);
  console.log("DefensiveFundtable: refreshing state initialized to false.");

  const navigation = useNavigation();
  console.log("DefensiveFundtable: Navigation hook initialized.");

  const fetchFundData = async () => {
    console.log("DefensiveFundtable: Data fetching process initiated.");
    setLoading(true);
    console.log("DefensiveFundtable: Loading state set to true.");
    setError(null);
    console.log("DefensiveFundtable: Error state reset to null.");

    try {
      console.log("DefensiveFundtable: Attempting to retrieve 'fund_table_config' from 'general' collection.");
      const docRef = doc(db, "general", "fund_table_config");
      const docSnap = await getDoc(docRef);
      console.log("DefensiveFundtable: 'fund_table_config' document fetch attempt completed.");

      if (docSnap.exists()) {
        console.log("DefensiveFundtable: 'fund_table_config' found. Preparing to fetch fund data.");
        const config = docSnap.data();
        const collectionName = config.collection_name;
        const subcollectionField = config.subcollection_field;
        console.log(`DefensiveFundtable: Configuration loaded. Collection name: '${collectionName}', Subcollection field: '${subcollectionField || "N/A"}'.`);

        const q = query(collection(db, collectionName), where("visible", "==", true), limit(50));
        console.log(`DefensiveFundtable: Querying collection '${collectionName}' for visible funds (limit 50).`);
        const querySnapshot = await getDocs(q);
        console.log(`DefensiveFundtable: Fetched ${querySnapshot.docs.length} visible fund documents.`);

        const dataPromises = querySnapshot.docs.map(async (fundDoc) => {
          const fund = fundDoc.data();
          const fundId = fundDoc.id;
          console.log(`DefensiveFundtable: Processing fund document with ID: ${fundId}.`);

          if (subcollectionField && fund[subcollectionField]) {
            console.log(`DefensiveFundtable: Subcollection field '${subcollectionField}' found for fund '${fundId}'. Fetching performance data.`);
            const subCollectionRef = collection(db, collectionName, fundId, fund[subcollectionField]);
            const subCollectionSnapshot = await getDocs(subCollectionRef);
            const performanceData = subCollectionSnapshot.docs.map(doc => doc.data());
            fund.performance = performanceData.sort((a, b) => a.date.seconds - b.date.seconds);
            console.log(`DefensiveFundtable: Performance data fetched and sorted for fund '${fundId}'. Items: ${performanceData.length}`);
          } else {
            console.log(`DefensiveFundtable: No subcollection field '${subcollectionField}' or data found for fund '${fundId}'. Skipping performance data fetch.`);
          }
          return { id: fundId, ...fund };
        });

        const allFundData = await Promise.all(dataPromises);
        setFundData(allFundData);
        console.log(`DefensiveFundtable: Fund data successfully updated with ${allFundData.length} items.`);
      } else {
        console.log("DefensiveFundtable: Fund table configuration document not found in Firestore.");
        Alert.alert("Error", "Fund table configuration not found.");
        console.log("DefensiveFundtable: Alert 'Fund table configuration not found' is displayed.");
        setError("Fund table configuration not found.");
        console.log("DefensiveFundtable: Error state updated to 'Fund table configuration not found'.");
      }
    } catch (e) {
      console.log(`DefensiveFundtable: Error occurred during fund data fetch: ${e.message}`);
      console.error("DefensiveFundtable: Detailed error:", e);
      setError(e.message);
      console.log(`DefensiveFundtable: Error state updated to: '${e.message}'.`);
      Alert.alert("Error", "Failed to fetch fund data: " + e.message);
      console.log("DefensiveFundtable: Alert 'Failed to fetch fund data' is displayed.");
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("DefensiveFundtable: Data fetch process completed. Loading and refreshing states set to false.");
    }
  };

  useEffect(() => {
    console.log("DefensiveFundtable: useEffect hook triggered for initial data load.");
    fetchFundData();
    return () => {
      console.log("DefensiveFundtable: useEffect cleanup function executed.");
    };
  }, []);

  const onRefresh = () => {
    console.log("DefensiveFundtable: User initiated a refresh action.");
    setRefreshing(true);
    console.log("DefensiveFundtable: Refreshing state set to true.");
    fetchFundData();
  };

  const renderItem = ({ item }) => {
    // Logs for each item rendering are omitted to prevent excessive logging on large lists.
    // Critical interactions within renderItem are still logged.
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => {
          console.log(`DefensiveFundtable: Card for fund '${item.name}' (ID: ${item.id}) is pressed.`);
          if (item.symbol) {
            console.log(`DefensiveFundtable: Navigating to 'DefensiveFundDetail' screen with symbol: '${item.symbol}'.`);
            navigation.navigate('DefensiveFundDetail', { symbol: item.symbol, name: item.name });
          } else {
            console.log("DefensiveFundtable: Fund symbol is not available for navigation. Displaying error alert.");
            Alert.alert("Error", "Fund symbol not available.");
            console.log("DefensiveFundtable: Alert 'Fund symbol not available' is displayed.");
          }
        }}>
          <Text style={styles.fundName}>{item.name}</Text>
          <Text style={styles.fundSymbol}>{item.symbol}</Text>
          <Text style={styles.fundType}>{item.type}</Text>
          {item.performance && item.performance.length > 0 && (
            <Text style={styles.performanceText}>Last Updated: {new Date(item.performance[item.performance.length - 1].date.seconds * 1000).toLocaleDateString()}</Text>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  if (loading && fundData.length === 0) {
    console.log("DefensiveFundtable: Conditional rendering: Displaying initial loading indicator as no data is loaded yet.");
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading fund data...</Text>
      </View>
    );
  }

  if (error) {
    console.log(`DefensiveFundtable: Conditional rendering: Displaying error screen with message: '${error}'.`);
    return (
      <View style={styles.centeredView}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.retryButton}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log("DefensiveFundtable: Conditional rendering: Displaying main FlatList with fetched fund data.");
  return (
    <View style={styles.container}>
      <FlatList
        data={fundData}
        renderItem={renderItem}
        keyExtractor={item => item.id}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
          />
        }
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    paddingTop: 10,
  },
  listContent: {
    paddingHorizontal: 10,
    paddingBottom: 20,
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  fundName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  fundSymbol: {
    fontSize: 14,
    color: '#666',
    marginTop: 5,
  },
  fundType: {
    fontSize: 14,
    color: '#666',
    fontStyle: 'italic',
    marginTop: 5,
  },
  performanceText: {
    fontSize: 12,
    color: '#999',
    marginTop: 10,
  },
  centeredView: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    color: 'red',
    fontSize: 16,
    marginBottom: 10,
  },
  retryButton: {
    color: '#007bff',
    fontSize: 16,
    textDecorationLine: 'underline',
  },
});

export default DefensiveFundtable;