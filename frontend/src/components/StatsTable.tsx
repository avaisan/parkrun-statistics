import { useState, useMemo } from 'react';
import {
  Table, TableBody, TableCell, TableContainer, TableHead, TableRow,
  Paper, TableSortLabel, Select, MenuItem, FormControl, InputLabel,
  Stack, Tooltip, Link
} from '@mui/material';
import { QuarterlyStats, CountryCode } from '../types.js';
import { formatTime } from '../services/time_format.js';

interface StatsTableProps {
  data: QuarterlyStats[];
}

const COUNTRY_NAMES: Record<string, string> = {
  'FI': 'Finland',
  'SE': 'Sweden',
  'NO': 'Norway',
  'DK': 'Denmark'
};

const BASE_URLS: Record<string, string> = {
  'Finland': 'https://www.parkrun.fi',
  'Sweden': 'https://www.parkrun.se',
  'Norway': 'https://www.parkrun.no',
  'Denmark': 'https://www.parkrun.dk'
};

const getEventUrl = (eventName: string, country: string): string => {
  const baseUrl = BASE_URLS[country];
  return `${baseUrl}/${eventName}`;
};

export const StatsTable = ({ data }: StatsTableProps) => {
  const [selectedCountry, setSelectedCountry] = useState<CountryCode>('ALL');
  const [selectedYear, setSelectedYear] = useState<string>('ALL');
  const [selectedQuarter, setSelectedQuarter] = useState<string>('ALL');
  const [orderBy, setOrderBy] = useState<keyof QuarterlyStats>('eventName');
  const [order, setOrder] = useState<'asc' | 'desc'>('asc');

  // Get unique years and quarters from data
  const years = useMemo(() => {
    const uniqueYears = [...new Set(data.map(item => item.year))];
    return uniqueYears.sort((a, b) => b - a); // Sort descending
  }, [data]);

  const quarters = useMemo(() => [1, 2, 3, 4], []);

  const handleSort = (property: keyof QuarterlyStats) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
  };

  const filteredData = data
    .filter(row => selectedCountry === 'ALL' || COUNTRY_NAMES[selectedCountry] === row.eventCountry)
    .filter(row => selectedYear === 'ALL' || row.year === parseInt(selectedYear))
    .filter(row => selectedQuarter === 'ALL' || row.quarter === parseInt(selectedQuarter))
    .sort((a, b) => {
      const isAsc = order === 'asc';
      return (isAsc ? 1 : -1) * (a[orderBy] < b[orderBy] ? -1 : 1);
    });

  return (
    <>
      <Stack direction="row" spacing={2} sx={{ mb: 2 }}>
        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Country</InputLabel>
          <Select
            value={selectedCountry}
            onChange={(e) => setSelectedCountry(e.target.value as CountryCode)}
            label="Country"
          >
            <MenuItem value="ALL">All Countries</MenuItem>
            <MenuItem value="FI">Finland</MenuItem>
            <MenuItem value="SE">Sweden</MenuItem>
            <MenuItem value="NO">Norway</MenuItem>
            <MenuItem value="DK">Denmark</MenuItem>
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Year</InputLabel>
          <Select
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            label="Year"
          >
            <MenuItem value="ALL">All Years</MenuItem>
            {years.map(year => (
              <MenuItem key={year} value={year}>{year}</MenuItem>
            ))}
          </Select>
        </FormControl>

        <FormControl sx={{ minWidth: 120 }}>
          <InputLabel>Quarter</InputLabel>
          <Select
            value={selectedQuarter}
            onChange={(e) => setSelectedQuarter(e.target.value)}
            label="Quarter"
          >
            <MenuItem value="ALL">All Quarters</MenuItem>
            {quarters.map(quarter => (
              <MenuItem key={quarter} value={quarter}>Q{quarter}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </Stack>

      <TableContainer component={Paper}>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'eventName'}
                  direction={orderBy === 'eventName' ? order : 'asc'}
                  onClick={() => handleSort('eventName')}
                >
                  Event Name
                </TableSortLabel>
              </TableCell>
              <TableCell>
                <TableSortLabel
                  active={orderBy === 'eventCountry'}
                  direction={orderBy === 'eventCountry' ? order : 'asc'}
                  onClick={() => handleSort('eventCountry')}
                >
                  Country
                </TableSortLabel>
              </TableCell>
              <TableCell>Period</TableCell>
              <TableCell>
                <Tooltip title="Fastest singular finish time during this quarter in this event">
                <TableSortLabel
                  active={orderBy === 'fastest_time'}
                  direction={orderBy === 'fastest_time' ? order : 'asc'}
                  onClick={() => handleSort('fastest_time')}
                >
                  Fastest finish time
                </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="25% of runners finished faster than this time">
                  <TableSortLabel
                    active={orderBy === 'fastest_quartile'}
                    direction={orderBy === 'fastest_quartile' ? order : 'asc'}
                    onClick={() => handleSort('fastest_quartile')}
                  >
                    Fastest quartile
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="Average finish time of all runners">
                <TableSortLabel
                  active={orderBy === 'avg_finish_time'}
                  direction={orderBy === 'avg_finish_time' ? order : 'asc'}
                  onClick={() => handleSort('avg_finish_time')}
                >
                  Average time
                </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="75% of runners finished faster than this time">
                  <TableSortLabel
                    active={orderBy === 'slowest_quartile'}
                    direction={orderBy === 'slowest_quartile' ? order : 'asc'}
                    onClick={() => handleSort('slowest_quartile')}
                  >
                    Slowest quartile
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
              <TableCell>
                <Tooltip title="During this quarter an average of this many runners participated">
                  <TableSortLabel
                    active={orderBy === 'avg_participants'}
                    direction={orderBy === 'avg_participants' ? order : 'asc'}
                    onClick={() => handleSort('avg_participants')}
                >
                    Average count of participants
                  </TableSortLabel>
                </Tooltip>
              </TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {filteredData.map((row, index) => (
              <TableRow key={index}>
                <TableCell>
                  <Link
                    href={getEventUrl(row.eventName, row.eventCountry)}
                    target="_blank"
                    rel="noopener noreferrer"
                    sx={{ 
                      color: 'primary.main',
                      textDecoration: 'none',
                      '&:hover': {
                        textDecoration: 'underline'
                      }
                    }}
                  >
                    {row.eventName}
                  </Link>
                </TableCell>
                <TableCell>{row.eventCountry}</TableCell>
                <TableCell>{`${row.year} Q${row.quarter}`}</TableCell>
                <TableCell>{formatTime(row.fastest_time)}</TableCell>
                <TableCell>{formatTime(row.fastest_quartile)}</TableCell>
                <TableCell>{formatTime(row.avg_finish_time)}</TableCell>
                <TableCell>{formatTime(row.slowest_quartile)}</TableCell>
                <TableCell>{Math.round(row.avg_participants)}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </TableContainer>
    </>
  );
};