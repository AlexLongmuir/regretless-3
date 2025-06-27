import React, { useState } from 'react';
import { ScrollView, View, Text, StyleSheet } from 'react-native';
import { theme } from '../utils/theme';
import { Button } from '../components/Button';
import { Input } from '../components/Input';
import { Card } from '../components/Card';
import { Badge } from '../components/Badge';
import { Avatar } from '../components/Avatar';
import { Chip } from '../components/Chip';
import { Divider } from '../components/Divider';
import { LoaderOverlay } from '../components/LoaderOverlay';
import { Progress } from '../components/Progress';
import { Switch } from '../components/Switch';

const HomePage = () => {
  const [inputValue, setInputValue] = useState('');
  const [switchValue, setSwitchValue] = useState(false);
  const [selectedChip, setSelectedChip] = useState(false);
  const [showLoader, setShowLoader] = useState(false);

  return (
    <View style={styles.container}>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.title}>UI Components Demo</Text>
        
        <Text style={styles.sectionTitle}>Buttons</Text>
        <View style={styles.row}>
          <Button title="Primary" onPress={() => console.log('Primary')} />
          <Button title="Secondary" variant="secondary" onPress={() => console.log('Secondary')} />
          <Button title="Outline" variant="outline" onPress={() => console.log('Outline')} />
        </View>
        <View style={styles.row}>
          <Button title="Small" size="sm" onPress={() => console.log('Small')} />
          <Button title="Medium" size="md" onPress={() => console.log('Medium')} />
          <Button title="Large" size="lg" onPress={() => console.log('Large')} />
        </View>
        <Button title="Disabled" disabled onPress={() => console.log('Disabled')} />

        <Divider />

        <Text style={styles.sectionTitle}>Input</Text>
        <Input
          value={inputValue}
          onChangeText={setInputValue}
          placeholder="Enter text here"
          label="Text Input"
        />
        <Input
          value=""
          onChangeText={() => {}}
          placeholder="Disabled input"
          label="Disabled Input"
          disabled
        />
        <Input
          value=""
          onChangeText={() => {}}
          placeholder="Input with error"
          label="Error Input"
          error="This field is required"
        />

        <Divider />

        <Text style={styles.sectionTitle}>Cards</Text>
        <Card style={styles.cardSpacing}>
          <Text>Default Card</Text>
        </Card>
        <Card variant="outlined" style={styles.cardSpacing}>
          <Text>Outlined Card</Text>
        </Card>
        <Card variant="elevated" style={styles.cardSpacing}>
          <Text>Elevated Card</Text>
        </Card>

        <Divider />

        <Text style={styles.sectionTitle}>Badges</Text>
        <View style={styles.row}>
          <Badge>Primary</Badge>
          <Badge variant="secondary">Secondary</Badge>
          <Badge variant="success">Success</Badge>
          <Badge variant="warning">Warning</Badge>
          <Badge variant="error">Error</Badge>
        </View>
        <View style={styles.row}>
          <Badge size="sm">Small</Badge>
          <Badge size="md">Medium</Badge>
          <Badge size="lg">Large</Badge>
        </View>

        <Divider />

        <Text style={styles.sectionTitle}>Avatars</Text>
        <View style={styles.row}>
          <Avatar name="John Doe" size="sm" />
          <Avatar name="Jane Smith" size="md" />
          <Avatar name="Bob Johnson" size="lg" />
          <Avatar name="Alice Brown" size="xl" />
        </View>

        <Divider />

        <Text style={styles.sectionTitle}>Chips</Text>
        <View style={styles.row}>
          <Chip label="Default" onPress={() => console.log('Default chip')} />
          <Chip label="Outlined" variant="outlined" onPress={() => console.log('Outlined chip')} />
          <Chip 
            label="Selected" 
            selected={selectedChip} 
            onPress={() => setSelectedChip(!selectedChip)} 
          />
          <Chip 
            label="Deletable" 
            onPress={() => console.log('Deletable chip')}
            onDelete={() => console.log('Delete chip')} 
          />
        </View>

        <Divider />

        <Text style={styles.sectionTitle}>Dividers</Text>
        <Divider />
        <Divider label="With Label" />
        
        <Divider />

        <Text style={styles.sectionTitle}>Progress</Text>
        <Progress value={30} showLabel />
        <Progress value={65} showLabel label="Custom Label" />
        <Progress value={90} color={theme.colors.success[500]} />

        <Divider />

        <Text style={styles.sectionTitle}>Switch</Text>
        <View style={styles.row}>
          <Switch value={switchValue} onValueChange={setSwitchValue} />
          <Switch value={true} onValueChange={() => {}} size="sm" />
          <Switch value={false} onValueChange={() => {}} size="lg" />
          <Switch value={true} onValueChange={() => {}} disabled />
        </View>

        <Divider />

        <Text style={styles.sectionTitle}>Loader Overlay</Text>
        <Button 
          title={showLoader ? "Hide Loader" : "Show Loader"} 
          onPress={() => setShowLoader(!showLoader)} 
        />
      </ScrollView>

      <LoaderOverlay 
        visible={showLoader} 
        message="Loading..." 
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.surface[100],
  },
  scrollView: {
    flex: 1,
  },
  content: {
    padding: theme.spacing.md,
    paddingTop: 60,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: theme.colors.grey[900],
    marginBottom: theme.spacing.lg,
    textAlign: 'center',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: theme.colors.grey[800],
    marginVertical: theme.spacing.md,
  },
  row: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: theme.spacing.sm,
    marginBottom: theme.spacing.sm,
  },
  cardSpacing: {
    marginBottom: theme.spacing.sm,
  },
});

export default HomePage; 