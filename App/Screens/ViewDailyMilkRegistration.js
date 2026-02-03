// AdminDataScreen.js
import React, { useEffect, useState } from "react";
import { View, StyleSheet, ScrollView, RefreshControl } from "react-native";
import { DataTable, ActivityIndicator, Text } from "react-native-paper";
import axios from "axios";
import { API } from "../../App_Utils/Services/APIService";
import { useLoading } from "../../App_Utils/Contexts/LoadingContext";

export default function ViewDailyMilkRegistration() {
  const [data, setData] = useState([]);
  const {setLoading} = useLoading()
  const [refreshing, setRefreshing] = useState(false);

  const fetchData = async () => {
    try {
      setLoading(true, "Getting Daily Milk Registered Users");
      var res = await API.GET("DailyMilkRegistration");
      console.log(res);
      setData(res.Response)
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const onRefresh = async () => {
    setRefreshing(true);
    await fetchData();
    setRefreshing(false);
  };

  const columns = [
    // { key: "transid", label: "Transaction ID", width: 200 },
    // { key: "userid", label: "User ID", width: 200 },
    { key: "transid", label: "Name", width: 160 },
    { key: "name", label: "Name", width: 120 },
    { key: "dob", label: "Date of Birth", width: 200 },
    { key: "address", label: "Address", width: 200 },
    { key: "mobile", label: "Mobile", width: 100 },
    { key: "latitude", label: "Latitude", width: 90 },
    { key: "longitude", label: "Longitude", width: 90 },
    { key: "familymembers", label: "Family", width: 80 },
    { key: "status", label: "Status", width: 80 },
    // { key: "rcu", label: "RCU", width: 150 },
    // { key: "rcm", label: "RCM", width: 80 },
    // { key: "luu", label: "Last Updated", width: 150 },
    // { key: "lum", label: "Last Modified", width: 150 },
  ];

//   if (loading) {
//     return (
//       <View style={styles.loaderContainer}>
//         <ActivityIndicator size="large" />
//         <Text style={{ marginTop: 8 }}>Loading admin data…</Text>
//       </View>
//     );
//   }

  return (
    <View style={styles.container}>
      <ScrollView
        horizontal
        contentContainerStyle={styles.scrollContainer}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
      >
        <DataTable>
          <DataTable.Header style={styles.header}>
            {columns.map((col) => (
              <DataTable.Title
                key={col.key}
                style={{ minWidth: col.width }}
                sortDirection={false}
              >
                {col.label}
              </DataTable.Title>
            ))}
          </DataTable.Header>

          {data.length === 0 ? (
            <View style={styles.empty}>
              <Text>No records found.</Text>
            </View>
          ) : (
            data.map((row, idx) => (
              <DataTable.Row
                key={row.transid}
                style={idx % 2 === 0 ? styles.rowEven : styles.rowOdd}
              >
                {columns.map((col) => (
                  <DataTable.Cell key={col.key} style={{ minWidth: col.width }}>
                    {row[col.key] ?? "—"}
                  </DataTable.Cell>
                ))}
              </DataTable.Row>
            ))
          )}
        </DataTable>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f7f9fc",
    padding: 16,
  },
  scrollContainer: {
    paddingBottom: 16,
  },
  header: {
    backgroundColor: "#eef1f8",
  },
  rowEven: {
    backgroundColor: "#ffffff",
  },
  rowOdd: {
    backgroundColor: "#f4f6fa",
  },
  loaderContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  empty: {
    padding: 24,
    alignItems: "center",
  },
});
