import React, { useState, useEffect } from 'react';
import { View, Text, FlatList, StyleSheet, ActivityIndicator, TouchableOpacity, RefreshControl, Alert } from 'react-native';
import { doc, getDoc, collection, query, where, getDocs, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import { useNavigation } from '@react-navigation/native';

const DefensiveFundTable = () => {
  console.log("DefensiveFundTable: Component mounted."); // 1. Component Lifecycle

  const [fundData, setFundData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [refreshing, setRefreshing] = useState(false);
  console.log("DefensiveFundTable: State variables initialized (fundData, loading, error, refreshing)."); // 2. State Change

  const navigation = useNavigation();
  console.log("DefensiveFundTable: useNavigation hook initialized."); // 3. Navigation & UI

  const fetchFundData = async () => {
    console.log("DefensiveFundTable: fetchFundData initiated."); // 4. Data Operation
    setLoading(true);
    console.log("DefensiveFundTable: Loading state set to true for data fetch."); // 5. State Change
    setError(null);

    try {
      console.log("DefensiveFundTable: Attempting to fetch fund table configuration."); // 6. Data Operation
      const docRef = doc(db, "general", "fund_table_config");
      const docSnap = await getDoc(docRef);

      if (docSnap.exists()) {
        console.log("DefensiveFundTable: Fund table configuration found. Proceeding to fetch fund data."); // 7. Conditional Logic, Data Operation
        const config = docSnap.data();
        const collectionName = config.collection_name;
        const subcollectionField = config.subcollection_field;

        const q = query(collection(db, collectionName), where("visible", "==", true), limit(50));
        const querySnapshot = await getDocs(q);
        console.log(`DefensiveFundTable: Fetched ${querySnapshot.docs.length} visible fund documents from '${collectionName}'.`); // 8. Data Operation

        const dataPromises = querySnapshot.docs.map(async (fundDoc) => {
          const fund = fundDoc.data();
          const fundId = fundDoc.id;

          if (subcollectionField && fund[subcollectionField]) {
            console.log(`DefensiveFundTable: Fetching performance data for fund ${fundId}.`); // 9. Data Operation
            const subCollectionRef = collection(db, collectionName, fundId, fund[subcollectionField]);
            const subCollectionSnapshot = await getDocs(subCollectionRef);
            const performanceData = subCollectionSnapshot.docs.map(doc => doc.data());
            fund.performance = performanceData.sort((a, b) => a.date.seconds - b.date.seconds);
            console.log(`DefensiveFundTable: Performance data fetched for fund ${fundId}.`); // 10. Data Operation
          }
          return { id: fundId, ...fund };
        });

        const allFundData = await Promise.all(dataPromises);
        setFundData(allFundData);
        console.log(`DefensiveFundTable: Fund data updated with ${allFundData.length} items.`); // 11. State Change, Data Operation Success
      } else {
        console.log("DefensiveFundTable: Fund table configuration not found."); // 12. Conditional Logic, Error Scenario
        Alert.alert("Error", "Fund table configuration not found.");
        console.log("DefensiveFundTable: Alert 'Fund table configuration not found' displayed."); // 13. Navigation & UI
        setError("Fund table configuration not found.");
        console.log("DefensiveFundTable: Error state set: 'Fund table configuration not found'."); // 14. State Change
      }
    } catch (e) {
      console.log(`DefensiveFundTable: Error fetching fund data: ${e.message}`); // 15. Error Scenarios
      console.error("Error fetching fund data:", e);
      setError(e.message);
      console.log(`DefensiveFundTable: Error state set to: ${e.message}.`); // 16. State Change
      Alert.alert("Error", "Failed to fetch fund data: " + e.message);
      console.log("DefensiveFundTable: Alert 'Failed to fetch fund data' displayed."); // 17. Navigation & UI
    } finally {
      setLoading(false);
      setRefreshing(false);
      console.log("DefensiveFundTable: Data fetch complete. Loading and refreshing states set to false."); // 18. State Change, Data Operation Complete
    }
  };

  useEffect(() => {
    console.log("DefensiveFundTable: useEffect triggered for initial data load."); // 19. Component Lifecycle
    fetchFundData();
  }, []);

  const onRefresh = () => {
    console.log("DefensiveFundTable: onRefresh initiated by user."); // 20. User Interaction
    setRefreshing(true);
    console.log("DefensiveFundTable: Refreshing state set to true."); // 21. State Change
    fetchFundData();
  };

  const renderItem = ({ item }) => {
    // Logs for each item rendering are omitted to prevent excessive logging on large lists.
    // Critical interactions within renderItem are still logged.
    return (
      <View style={styles.card}>
        <TouchableOpacity onPress={() => {
          console.log(`DefensiveFundTable: Card for fund '${item.name}' pressed.`); // 22. User Interaction
          if (item.symbol) {
            console.log(`DefensiveFundTable: Navigating to DefensiveFundDetail for symbol: ${item.symbol}`); // 23. Navigation & UI, Conditional Logic
            navigation.navigate('DefensiveFundDetail', { symbol: item.symbol, name: item.name });
          } else {
            console.log("DefensiveFundTable: Fund symbol not available for navigation. Alerting user."); // 24. Conditional Logic, Error Scenarios
            Alert.alert("Error", "Fund symbol not available.");
            console.log("DefensiveFundTable: Alert 'Fund symbol not available' displayed."); // 25. Navigation & UI
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
    console.log("DefensiveFundTable: Displaying initial loading indicator."); // 26. Conditional Logic, UI
    return (
      <View style={styles.centeredView}>
        <ActivityIndicator size="large" color="#0000ff" />
        <Text>Loading fund data...</Text>
      </View>
    );
  }

  if (error) {
    console.log(`DefensiveFundTable: Displaying error screen. Current error: ${error}`); // 27. Conditional Logic, Error Scenarios, UI
    return (
      <View style={styles.centeredView}>
        <Text style={styles.errorText}>Error: {error}</Text>
        <TouchableOpacity onPress={onRefresh}>
          <Text style={styles.retryButton}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  console.log("DefensiveFundTable: Rendering main FlatList with fund data."); // 28. Component Lifecycle, UI
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

export default DefensiveFundTable;