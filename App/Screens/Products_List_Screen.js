import React, { useMemo, useState, useCallback, useEffect } from 'react';
import {
    View,
    Text,
    TextInput,
    FlatList,
    TouchableOpacity,
    RefreshControl,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { MaterialIcons } from '@expo/vector-icons';
import { API } from '../../App_Utils/Services/APIService';
import { useLoading } from '../../App_Utils/Contexts/LoadingContext';
import { useNavigation } from '@react-navigation/native';



/* ---------- utils ---------- */
const nullish = (v) =>
    v === null || v === undefined || v === '' || String(v).toUpperCase() === 'NULL';

const asBool = (v) => (String(v) === '1' || String(v).toLowerCase() === 'true');

const fmtDate = (v) => {
    if (nullish(v)) return '—';
    // tries to make it readable; falls back to raw string if parsing fails
    const d = new Date(v);
    return isNaN(d.getTime()) ? String(v) : d.toLocaleString();
};

const normalize = (row) => ({
    ...row,
    isactive: asBool(row.isactive),
    isfeatured: asBool(row.isfeatured),
    typename: nullish(row.typename) ? null : row.typename,
    typeid: nullish(row.typeid) ? null : row.typeid,
    categoryname: nullish(row.categoryname) ? null : row.categoryname,
    categoryid: nullish(row.categoryid) ? null : row.categoryid,
    sectionname: nullish(row.sectionname) ? null : row.sectionname,
    sectionid: nullish(row.sectionid) ? null : row.sectionid,
    menuname: nullish(row.menuname) ? null : row.menuname,
    menuid: nullish(row.menuid) ? null : row.menuid,
    rcu: nullish(row.rcu) ? null : row.rcu,
    rcm: nullish(row.rcm) ? null : row.rcm,
    luu: nullish(row.luu) ? null : row.luu,
    lcm: nullish(row.lcm) ? null : row.lcm,
});

/* ---------- small UI helpers ---------- */
const Badge = ({ icon, text, tone = 'blue' }) => {
    const tones = {
        blue: 'bg-blue-100 text-blue-800',
        gray: 'bg-gray-100 text-gray-700',
        green: 'bg-green-100 text-green-800',
        yellow: 'bg-yellow-100 text-yellow-800',
        red: 'bg-red-100 text-red-800',
        orange: 'bg-orange-100 text-orange-800',
    };
    return (
        <View className={`flex-row items-center px-2.5 py-1 rounded-full ${tones[tone] || tones.blue}`}>
            {icon ? <MaterialIcons name={icon} size={14} style={{ marginRight: 4 }} /> : null}
            <Text className="text-xs font-medium">{text}</Text>
        </View>
    );
};

const Row = ({ label, children }) => (
    <View className="mb-2">
        <Text className="text-gray-500 text-xs mb-0.5">{label}</Text>
        <Text className="text-gray-900">{children || '—'}</Text>
    </View>
);

/* ---------- card component ---------- */
const ProductCard = ({ item, onPress }) => {
    const i = useMemo(() => normalize(item), [item]);

    return (
        <TouchableOpacity
            onPress={onPress}
            activeOpacity={0.8}
            className="mb-4 rounded-2xl overflow-hidden border border-gray-200 bg-white"
        >
            {/* top banner */}
            <LinearGradient
                colors={['#E6EEF8', '#FFFFFF']}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 0 }}
                className="px-4 pt-4 pb-3"
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-1 pr-3">
                        <Text className="text-lg font-semibold text-gray-900" numberOfLines={1}>
                            {i.productname || 'Unnamed Product'}
                        </Text>
                        <Text className="text-gray-500 mt-0.5" numberOfLines={1}>
                            {i.productcode || '—'}
                        </Text>
                    </View>

                    <View className="flex-row space-x-2">
                        <Badge
                            icon={i.isactive ? 'visibility' : 'visibility-off'}
                            text={i.isactive ? 'Active' : 'Inactive'}
                            tone={i.isactive ? 'green' : 'gray'}
                        />
                        {i.isfeatured ? <Badge icon="star" text="Featured" tone="orange" /> : null}
                    </View>
                </View>
            </LinearGradient>

            {/* body */}
            <View className="px-4 pt-3 pb-3">
                <Row label="Short Description">{i.shortdescription}</Row>
                <Row label="Full Description">{i.fulldescription}</Row>

                {/* taxonomy chips */}
                <View className="flex-row flex-wrap gap-2 mt-2">
                    <Badge icon="category" text={i.categoryname || 'No Category'} tone={i.categoryname ? 'blue' : 'gray'} />
                    <Badge icon="view-list" text={i.typename || 'No Type'} tone={i.typename ? 'blue' : 'gray'} />
                    <Badge icon="layers" text={i.sectionname || 'No Section'} tone={i.sectionname ? 'blue' : 'gray'} />
                    <Badge icon="menu" text={i.menuname || 'No Menu'} tone={i.menuname ? 'blue' : 'gray'} />
                </View>

                {/* meta */}
                <View className="mt-3 border-t border-gray-100 pt-3">
                    <View className="flex-row items-center justify-between">
                        <View className="flex-1 pr-2">
                            <Text className="text-xs text-gray-500">Created By</Text>
                            <Text className="text-gray-800">{i.rcu || '—'}</Text>
                        </View>
                        <View className="flex-1 px-2">
                            <Text className="text-xs text-gray-500">Created At</Text>
                            <Text className="text-gray-800">{fmtDate(i.rcm)}</Text>
                        </View>
                        <View className="flex-1 pl-2">
                            <Text className="text-xs text-gray-500">Last Updated</Text>
                            <Text className="text-gray-800">{fmtDate(i.lcm)}</Text>
                        </View>
                    </View>
                </View>
            </View>

            {/* footer actions */}
            <View className="px-4 pb-4">
                <View className="flex-row justify-end space-x-2">
                    <TouchableOpacity className="px-3 py-2 rounded-lg bg-gray-100 flex-row items-center">
                        <MaterialIcons name="remove-red-eye" size={18} />
                        <Text className="ml-1 text-gray-800">View</Text>
                    </TouchableOpacity>
                    <TouchableOpacity className="px-3 py-2 rounded-lg bg-blue-600 flex-row items-center">
                        <MaterialIcons name="edit" size={18} color="white" />
                        <Text className="ml-1 text-white">Edit</Text>
                    </TouchableOpacity>
                </View>
            </View>
        </TouchableOpacity>
    );
};

/* ---------- screen ---------- */
const Products_List_Screen = () => {
    const nav = useNavigation();
    const [query, setQuery] = useState('');
    const [refreshing, setRefreshing] = useState(false);

    const { setLoading } = useLoading();

    const [products, setProducts] = useState([]);

    const fetchProducts = async () => {
        try {
            setLoading(true, "Fetching products...");
            setRefreshing(true);
            const res = await API.GET("Products_new");
            setProducts(res.Response || []);
            setData(res.Response || []);
        } catch (err) {
            Alert.alert("Error", "Failed to fetch products. Please try again later.       ");
            console.error(err);
        } finally {
            setLoading(false);
            setRefreshing(false);
        }
    };

    useEffect(() => {
        console.log("Fetching products...");
        fetchProducts();
    }, []);

    const [data, setData] = useState(products); // replace with API later

    const filtered = useMemo(() => {
        if (!query.trim()) return data;
        const q = query.toLowerCase();
        return data.filter((r) => {
            const i = normalize(r);
            return (
                (i.productname || '').toLowerCase().includes(q) ||
                (i.productcode || '').toLowerCase().includes(q) ||
                (i.shortdescription || '').toLowerCase().includes(q)
            );
        });
    }, [data, query]);

    const onRefresh = useCallback(() => {
        setRefreshing(true);
        // TODO: replace with your API fetch
        setTimeout(() => setRefreshing(false), 700);
    }, []);

    return (
        <View className="flex-1 bg-gray-50">
            {/* header */}
            <LinearGradient
                colors={['#4A6FA5', '#3A5673']}
                className="pt-12 pb-6 px-6 rounded-b-3xl"
            >
                <View className="flex-row items-center justify-between">
                    <View className="flex-row items-center">
                        <MaterialIcons name="view-module" size={26} color="white" />
                        <Text className="text-white text-2xl font-bold ml-3">
                            Products
                        </Text>
                    </View>

                    <TouchableOpacity className="bg-white/15 px-3 py-2 rounded-lg flex-row items-center" onPress={() => {
                        nav.navigate('Products_New')
                    }}>
                        <MaterialIcons name="add" size={20} color="#fff" />
                        <Text className="text-white ml-1">New</Text>
                    </TouchableOpacity>
                </View>

                {/* search */}
                <View className="mt-4 bg-white/95 rounded-xl flex-row items-center px-3 py-2">
                    <MaterialIcons name="search" size={20} color="#6B7280" />
                    <TextInput
                        placeholder="Search by name, code, or description..."
                        placeholderTextColor="#9CA3AF"
                        value={query}
                        onChangeText={setQuery}
                        className="flex-1 px-2 py-2 text-gray-900"
                    />
                    {query.length > 0 && (
                        <TouchableOpacity onPress={() => setQuery('')}>
                            <MaterialIcons name="close" size={18} color="#6B7280" />
                        </TouchableOpacity>
                    )}
                </View>
            </LinearGradient>

            {/* list */}
            <FlatList
                data={filtered}
                keyExtractor={(item) => item.productid}
                contentContainerClassName="px-4 pt-4 pb-8"
                renderItem={({ item }) => (
                    <ProductCard
                        item={item}
                        onPress={() => {
                            // navigate to detail or do something
                            console.log('open', item.productid);
                        }}
                    />
                )}
                ListEmptyComponent={
                    <View className="px-6 py-16 items-center">
                        <MaterialIcons name="inventory" size={28} color="#9CA3AF" />
                        <Text className="text-gray-500 mt-2">No products found.</Text>
                    </View>
                }
                refreshControl={
                    <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
                }
            />
        </View>
    );
};

export default Products_List_Screen;
